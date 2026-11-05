// Dólar oficial de referencia del BCRA (RF-21). Lo usan los ítems atados al
// dólar oficial, como las licencias de software (RN-15): precio en USD ×
// cotización × proporción. Funciones puras; la API la consulta el script de la
// Action diaria.
import type { Cotizacion } from './cotizaciones.ts';

export const API_DEL_OFICIAL = 'https://api.bcra.gob.ar/estadisticascambiarias/v1.0/Cotizaciones/USD';
export const FUENTE_DEL_OFICIAL = 'BCRA, cotización de referencia (API de estadísticas cambiarias)';

const DIA = /^\d{4}-\d{2}-\d{2}$/;

/**
 * La cotización del último día hábil que publicó el BCRA. La API devuelve
 * `results: [{ fecha, detalle: [{ codigoMoneda, tipoCotizacion }] }]`; si la
 * forma cambia, falla en vez de adivinar.
 */
export function leerRespuestaDelBcra(respuesta: unknown): Cotizacion {
  const r = respuesta as { results?: { fecha?: unknown; detalle?: { codigoMoneda?: unknown; tipoCotizacion?: unknown }[] }[] };
  const ultimo = r?.results?.[0];
  if (!ultimo || typeof ultimo.fecha !== 'string' || !DIA.test(ultimo.fecha)) {
    throw new Error(`El BCRA no devolvió una fecha válida: ${JSON.stringify(respuesta).slice(0, 300)}`);
  }
  const usd = ultimo.detalle?.find((d) => d.codigoMoneda === 'USD');
  const valor = usd?.tipoCotizacion;
  if (typeof valor !== 'number' || !Number.isFinite(valor) || valor <= 0) {
    throw new Error(`El BCRA no devolvió una cotización del dólar válida: ${JSON.stringify(ultimo).slice(0, 300)}`);
  }
  return { valor, fecha: ultimo.fecha, fuente: FUENTE_DEL_OFICIAL };
}
