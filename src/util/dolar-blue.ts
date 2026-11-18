
import { conCotizacion, type Cotizacion } from './cotizaciones.ts';

export type { Cotizacion };

export const API_DEL_BLUE = 'https://dolarapi.com/v1/dolares/blue';
export const FUENTE_DEL_BLUE = 'dolarapi.com, dólar blue (venta)';

function diaEnArgentina(instante: string): string {
  const fecha = new Date(instante);
  if (Number.isNaN(fecha.getTime())) throw new Error(`Fecha inválida en la respuesta: ${instante}`);
  return fecha.toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' });
}

export function leerRespuesta(respuesta: unknown): Cotizacion {
  const r = respuesta as { venta?: unknown; fechaActualizacion?: unknown };
  if (typeof r?.venta !== 'number' || !Number.isFinite(r.venta) || r.venta <= 0) {
    throw new Error(`La API no devolvió un precio de venta válido: ${JSON.stringify(respuesta)}`);
  }
  if (typeof r.fechaActualizacion !== 'string') throw new Error('La API no devolvió la fecha de la cotización.');
  return { valor: r.venta, fecha: diaEnArgentina(r.fechaActualizacion), fuente: FUENTE_DEL_BLUE };
}

export function conDolarBlue(texto: string, c: Cotizacion): string {
  return conCotizacion(texto, 'dolarBlue', c);
}
