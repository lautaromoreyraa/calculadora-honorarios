import type { Resultado } from '../calculo/tipos.ts';
import type { Datos } from '../datos/tipos.ts';
import { formatearNumero, formatearPesos } from '../formato.ts';
import { formatoDe } from '../moneda.ts';
import { textoDeValidez } from './fechas.ts';

export interface DatosDelPresupuesto {
  numero: string;
  profesional: string;
  email: string;
  telefono: string;
  cuit: string;
  empresa: string;
  contacto: string;
  descripcion: string;
  validez: string;
  condiciones: string;
  fecha?: Date;
}

export const MARCADORES = {
  numero: '[Número]',
  profesional: '[Nombre del profesional]',
  empresa: '[Cliente]',
  descripcion: '[Descripción del trabajo]',
  validez: '[Validez de la oferta]',
  condiciones: '[Condiciones de pago]',
} as const;

export const CONDICIONES_POR_DEFECTO =
  '50 % de anticipo al aprobar el presupuesto y 50 % contra entrega, por transferencia bancaria. ' +
  'El plazo de entrega corre desde la aprobación y el pago del anticipo.';

export const LEYENDA_FACTURA_C = 'Factura C: el IVA no se discrimina.';

export interface ContenidoDelPresupuesto {
  numero: string;
  fecha: string;
  profesional: { nombre: string; rol: string; contacto: string[] };
  cliente: { empresa: string; contacto?: string };
  trabajo: { descripcion: string; horas: string; valorHora: string };
  total: string;
  cotizacion?: string;
  condiciones: string[];
  validez: string;
  fundamento: string;
  vigencia: string;
}

const completar = (valor: string, marcador: string) => valor.trim() || marcador;

const fechaLarga = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
const mesLargo = new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric', timeZone: 'UTC' });

export function vigenciaDeLosValores(datos: Datos): string {
  const vigencias = [
    ...datos.roles.map((r) => r.vigencia),
    ...datos.items.map((i) => i.vigencia),
    ...datos.monotributo.categorias.map((c) => c.vigencia),
    ...datos.provincias.map((p) => p.ingresosBrutos.vigencia),
  ].sort();
  const [anio, mes] = vigencias.at(-1)!.split('-').map(Number);
  return mesLargo.format(new Date(Date.UTC(anio, mes - 1, 1)));
}

export function siguienteNumero(ultimo: string | null, anio: number): string {
  const primero = `${anio}-001`;
  const texto = ultimo?.trim() ?? '';
  const conAnio = /^(\d{4})-(\d+)$/.exec(texto);
  if (conAnio && Number(conAnio[1]) !== anio) return primero;
  const final = /^(.*?)(\d+)$/.exec(texto);
  if (!final) return primero;
  const [, prefijo, cifras] = final;
  return prefijo + String(Number(cifras) + 1).padStart(cifras.length, '0');
}

export function contenidoDelPresupuesto(
  resultado: Resultado,
  datos: Datos,
  p: DatosDelPresupuesto,
): ContenidoDelPresupuesto {
  const formato = formatoDe(resultado);
  const contacto = [
    p.email.trim(),
    p.telefono.trim() && `Tel. ${p.telefono.trim()}`,
    p.cuit.trim() && `CUIT ${p.cuit.trim()}`,
  ].filter(Boolean);
  const condiciones = completar(p.condiciones, MARCADORES.condiciones)
    .split(/\n+/)
    .map((c) => c.trim())
    .filter(Boolean);
  if (resultado.renglones.some((r) => r.id === 'monotributo')) condiciones.push(LEYENDA_FACTURA_C);

  return {
    numero: completar(p.numero, MARCADORES.numero),
    fecha: fechaLarga.format(p.fecha ?? new Date()),
    profesional: { nombre: completar(p.profesional, MARCADORES.profesional), rol: resultado.rol.nombre, contacto },
    cliente: { empresa: completar(p.empresa, MARCADORES.empresa), contacto: p.contacto.trim() || undefined },
    trabajo: {
      descripcion: completar(p.descripcion, MARCADORES.descripcion),
      horas: `${formatearNumero(resultado.horas)} h`,
      valorHora: formato.montoConCentavos(resultado.total / resultado.horas),
    },
    total: formato.monto(resultado.total),
    cotizacion: resultado.cotizacion
      ? `Montos en dólares al dólar blue de ${formatearPesos(resultado.cotizacion.valor)} del ${fechaLarga.format(
          new Date(`${resultado.cotizacion.fecha}T12:00:00`),
        )}.`
      : undefined,
    condiciones,
    validez: completar(textoDeValidez(p.validez), MARCADORES.validez),
    fundamento: `Valor hora de ${resultado.rol.nombre.toLowerCase()} según el convenio: ${resultado.rol.escala}.`,
    vigencia: `Valores de referencia vigentes a ${vigenciaDeLosValores(datos)}.`,
  };
}
