import { Packer } from 'docx';
import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { calcular, type Resultado, type Seleccion } from '../../../util/calculo/index.ts';
import { datos } from '../../../util/datos/index.ts';
import { formatearPesos } from '../../../util/formato.ts';
import {
  armarPresupuesto,
  MARCADORES,
  nombreDelArchivo,
  vigenciaDeLosValores,
  type DatosDelPresupuesto,
} from '../../../util/presupuesto/index.ts';

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
  if (!calculo.ok) throw new Error(calculo.errores.join(' '));
  return calculo.resultado;
}

const completo: DatosDelPresupuesto = {
  profesional: 'Ana Gómez',
  cliente: 'Radio Ciudad',
  descripcion: 'Producción de un programa especial',
  validez: '15 días',
  fecha: new Date(2026, 9, 13),
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

describe('RF-16 · presupuesto en Word', () => {
  it('tiene el total y cada renglón con los montos de la pantalla', async () => {
    const r = resultado();
    const texto = await textoDelWord(r, completo);
    expect(texto).toContain(`Total: ${formatearPesos(r.total)}`);
    for (const renglon of r.renglones) {
      expect(texto).toContain(renglon.concepto);
      expect(texto).toContain(renglon.detalle);
      expect(texto).toContain(formatearPesos(renglon.monto));
    }
  });

  it('incluye profesional, rol, cliente, fecha, trabajo, horas, validez y vigencia', async () => {
    const texto = await textoDelWord(resultado(), completo);
    expect(texto).toContain('Ana Gómez · Productor/a');
    expect(texto).toContain('Radio Ciudad');
    expect(texto).toContain('13 de octubre de 2026');
    expect(texto).toContain('Producción de un programa especial');
    expect(texto).toContain('12 h');
    expect(texto).toContain('15 días');
    expect(texto).toContain(`Valores de referencia vigentes a ${vigenciaDeLosValores(datos)}.`);
  });

  it('con Corrientes muestra subtotal e ingresos brutos sobre el total', async () => {
    const r = resultado({ provinciaId: 'corrientes' });
    expect(r.ingresosBrutosSobreTotal).toBeDefined();
    const texto = await textoDelWord(r, completo);
    expect(texto).toContain(formatearPesos(r.subtotal));
    expect(texto).toContain(r.ingresosBrutosSobreTotal!.detalle);
    expect(texto).toContain(formatearPesos(r.ingresosBrutosSobreTotal!.monto));
    expect(texto).toContain(`Total: ${formatearPesos(r.total)}`);
  });

  it('los campos vacíos salen como marcadores para completar', async () => {
    const texto = await textoDelWord(resultado(), { profesional: ' ', cliente: '', descripcion: '', validez: '' });
    for (const marcador of Object.values(MARCADORES)) expect(texto).toContain(marcador);
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
});
