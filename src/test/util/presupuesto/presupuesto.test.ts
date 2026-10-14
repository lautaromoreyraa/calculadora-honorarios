import { Packer } from 'docx';
import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { calcular, type Resultado, type Seleccion } from '../../../util/calculo/index.ts';
import { datos } from '../../../util/datos/index.ts';
import { formatearPesos, formatearPesosConCentavos } from '../../../util/formato.ts';
import { enDolares } from '../../../util/moneda.ts';
import {
  armarPresupuesto,
  CONDICIONES_POR_DEFECTO,
  MARCADORES,
  nombreDelArchivo,
  siguienteNumero,
  vigenciaDeLosValores,
  type DatosDelPresupuesto,
} from '../../../util/presupuesto/index.ts';
import { contenidoDelPresupuesto, LEYENDA_FACTURA_C } from '../../../util/presupuesto/contenido.ts';
import { fechaDentroDe } from '../../../util/presupuesto/fechas.ts';

// RF-16: el Word tiene que decir lo mismo que la pantalla. Se genera el .docx
// de verdad y se lee su XML.

function resultado(cambios: Partial<Seleccion> = {}): Resultado {
  const calculo = calcular(
    {
      rolId: 'productor',
      provinciaId: 'chaco',
      categoria: 'A',
      horas: 12,
      antiguedad: 3,
      items: { 'cliente-d': {}, multifuncion: {}, conectividad: {}, refrigerio: {}, 'ingresos-brutos': {} },
      ...cambios,
    },
    datos,
  );
  if (!calculo.ok) throw new Error(calculo.errores.map((e) => e.mensaje).join(' '));
  return calculo.resultado;
}

const completo: DatosDelPresupuesto = {
  numero: '2026-001',
  profesional: 'Ana Gómez',
  email: 'ana@ejemplo.com',
  telefono: '362 412-3456',
  cuit: '27-12345678-9',
  empresa: 'Radio Ciudad',
  contacto: 'Laura Pérez',
  descripcion: 'Producción de un programa especial',
  validez: '2026-10-28',
  condiciones: CONDICIONES_POR_DEFECTO,
  fecha: new Date(2026, 9, 13),
};

const vacio: DatosDelPresupuesto = {
  numero: '',
  profesional: ' ',
  email: '',
  telefono: '',
  cuit: '',
  empresa: '',
  contacto: '',
  descripcion: '',
  validez: '',
  condiciones: '',
};

/** Texto plano de word/document.xml: el XML sin etiquetas, con las entidades resueltas. */
async function textoDelWord(r: Resultado, presupuesto: DatosDelPresupuesto): Promise<string> {
  const buffer = await Packer.toBuffer(armarPresupuesto(r, datos, presupuesto));
  const zip = await JSZip.loadAsync(buffer);
  const xml = await zip.file('word/document.xml')!.async('string');
  return xml
    .replace(/<\/w:p>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

describe('RF-16 · número de presupuesto', () => {
  it('después del 2026-001 propone el 2026-002', () => {
    expect(siguienteNumero('2026-001', 2026)).toBe('2026-002');
    expect(siguienteNumero('2026-099', 2026)).toBe('2026-100');
  });

  it('sin anterior, o al cambiar de año, empieza en el 001 del año', () => {
    expect(siguienteNumero(null, 2026)).toBe('2026-001');
    expect(siguienteNumero('', 2026)).toBe('2026-001');
    expect(siguienteNumero('2026-031', 2027)).toBe('2027-001');
  });

  it('respeta la forma propia del profesional y le suma uno al final', () => {
    expect(siguienteNumero('P-17', 2026)).toBe('P-18');
    expect(siguienteNumero('Presupuesto Ana', 2026)).toBe('2026-001');
  });
});

describe('RF-16 · presupuesto en Word', () => {
  it('tiene el total de la pantalla', async () => {
    const r = resultado();
    const texto = await textoDelWord(r, completo);
    expect(texto).toContain(`Total del trabajo: ${formatearPesos(r.total)}`);
  });

  it('no muestra el desglose: ningún concepto ni monto de los renglones', async () => {
    const r = resultado();
    const texto = await textoDelWord(r, completo);
    for (const renglon of r.renglones) {
      expect(texto).not.toContain(renglon.detalle);
      expect(texto).not.toContain(formatearPesos(renglon.monto));
    }
    expect(texto).not.toContain('Tipo de cliente');
  });

  it('incluye profesional, rol, cliente, fecha, trabajo, horas, validez y vigencia', async () => {
    const texto = await textoDelWord(resultado(), completo);
    expect(texto).toContain('Ana Gómez');
    expect(texto).toContain('Productor/a');
    expect(texto).toContain('Radio Ciudad');
    expect(texto).toContain('13 de octubre de 2026');
    expect(texto).toContain('Producción de un programa especial');
    expect(texto).toContain('12 h');
    expect(texto).toContain('Validez de la oferta: hasta el 28 de octubre de 2026');
    expect(texto).toContain(`Valores de referencia vigentes a ${vigenciaDeLosValores(datos)}.`);
  });

  it('con Corrientes el total ya incluye ingresos brutos y no se muestra el subtotal', async () => {
    const r = resultado({ provinciaId: 'corrientes' });
    expect(r.ingresosBrutosSobreTotal).toBeDefined();
    const texto = await textoDelWord(r, completo);
    expect(texto).toContain(formatearPesos(r.total));
    expect(texto).not.toContain(formatearPesos(r.subtotal));
  });

  it('el total aparece una sola vez', async () => {
    const r = resultado();
    const texto = await textoDelWord(r, completo);
    expect(texto.split(formatearPesos(r.total)).length - 1).toBe(1);
  });

  it('los campos vacíos salen como marcadores para completar', async () => {
    const texto = await textoDelWord(resultado(), vacio);
    for (const marcador of Object.values(MARCADORES)) expect(texto).toContain(marcador);
  });

  it('el contacto vacío no sale: ni «Tel.» ni «CUIT» sueltos', async () => {
    const texto = await textoDelWord(resultado(), vacio);
    expect(texto).not.toContain('Tel.');
    expect(texto).not.toContain('CUIT');
  });

  it('lleva número, contacto del profesional, empresa y contacto del cliente y las condiciones', async () => {
    const texto = await textoDelWord(resultado(), completo);
    expect(texto).toContain('N.º 2026-001 · 13 de octubre de 2026');
    expect(texto).toContain('ana@ejemplo.com');
    expect(texto).toContain('Tel. 362 412-3456');
    expect(texto).toContain('CUIT 27-12345678-9');
    expect(texto).toContain('Laura Pérez');
    expect(texto).toContain('50 % de anticipo');
  });

  it('el renglón del trabajo: 10 h y $ 50.142 dan $ 5.014,20 por hora', async () => {
    const r = resultado({
      rolId: 'cm',
      horas: 10,
      antiguedad: 0,
      items: { 'cliente-a': {}, monotributo: {}, 'ingresos-brutos': {} },
    });
    expect(r.total).toBe(50142);
    const texto = await textoDelWord(r, completo);
    expect(texto).toContain('Valor por hora');
    expect(texto).toContain('10 h');
    expect(texto).toContain(formatearPesosConCentavos(5014.2));
  });

  it('con el monotributo dice «Factura C»; sin él no menciona el IVA', async () => {
    const con = await textoDelWord(resultado({ items: { 'cliente-a': {}, monotributo: {} } }), completo);
    expect(con).toContain(LEYENDA_FACTURA_C);
    const sin = await textoDelWord(resultado({ items: { 'cliente-a': {} } }), completo);
    expect(sin).not.toMatch(/IVA|Factura/);
  });

  it('la vista previa y el Word dicen lo mismo: todo el contenido está en el documento', async () => {
    const r = resultado({ items: { 'cliente-a': {}, monotributo: {} } });
    const c = contenidoDelPresupuesto(r, datos, completo);
    const texto = await textoDelWord(r, completo);
    const textos = [
      c.numero,
      c.fecha,
      c.profesional.nombre,
      c.profesional.rol,
      ...c.profesional.contacto,
      c.cliente.empresa,
      c.cliente.contacto!,
      c.trabajo.descripcion,
      c.trabajo.horas,
      c.trabajo.valorHora,
      c.total,
      ...c.condiciones,
      c.validez,
      c.vigencia,
    ];
    for (const x of textos) expect(texto).toContain(x);
  });

  it('no lleva marca del proyecto ni de la UNNE', async () => {
    const texto = await textoDelWord(resultado(), completo);
    expect(texto).not.toMatch(/UNNE|calculadora/i);
  });

  it('la vigencia es el mes más reciente de los datos', () => {
    expect(vigenciaDeLosValores(datos)).toBe('octubre de 2026');
  });

  it('el archivo se llama presupuesto-<rol>-<AAAA-MM-DD>.docx', () => {
    expect(nombreDelArchivo(resultado(), new Date(2026, 0, 5))).toBe('presupuesto-productor-2026-01-05.docx');
  });

  it('la validez por defecto es 15 días después de hoy, también al cruzar de mes y de año', () => {
    expect(fechaDentroDe(15, new Date(2026, 9, 14))).toBe('2026-10-29');
    expect(fechaDentroDe(15, new Date(2026, 11, 20))).toBe('2027-01-04');
  });

  it('RF-28 · en dólares el total sale en dólares y dice la cotización y su fecha', async () => {
    const cotizacion = { valor: 1550, fecha: '2026-10-14', fuente: 'dolarapi.com, dólar blue (venta)' };
    const c = calcular(
      { rolId: 'productor', provinciaId: 'chaco', categoria: 'A', horas: 12, antiguedad: 3, items: { 'cliente-d': {} } },
      datos,
      enDolares(cotizacion),
    );
    if (!c.ok) throw new Error('no calculó');
    const texto = await textoDelWord(c.resultado, completo);
    expect(texto).toContain(`Total del trabajo: ${enDolares(cotizacion).monto(c.resultado.total)}`);
    expect(texto).toContain(`dólar blue de ${formatearPesos(1550)} del 14 de octubre de 2026`);
  });
});
