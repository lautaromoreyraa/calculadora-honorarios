// Dólar blue del día (RF-29). Funciones puras: las usa el script que corre la
// GitHub Action diaria (scripts/actualizar-dolar-blue.ts), que es quien lee la
// API y escribe datos/parametros.json. El sitio no consulta ninguna API: lee
// el valor que quedó en los datos (RNF-06).

export const API_DEL_BLUE = 'https://dolarapi.com/v1/dolares/blue';
export const FUENTE_DEL_BLUE = 'dolarapi.com, dólar blue (venta)';

export interface Cotizacion {
  valor: number;
  /** Día de la cotización en Argentina, AAAA-MM-DD. */
  fecha: string;
  fuente: string;
}

/** Día en Argentina de un instante ISO: a las 22 h de Buenos Aires ya es mañana en UTC. */
function diaEnArgentina(instante: string): string {
  const fecha = new Date(instante);
  if (Number.isNaN(fecha.getTime())) throw new Error(`Fecha inválida en la respuesta: ${instante}`);
  return fecha.toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' });
}

/** Lo que importa de la respuesta de dolarapi.com: el precio de venta y su fecha. */
export function leerRespuesta(respuesta: unknown): Cotizacion {
  const r = respuesta as { venta?: unknown; fechaActualizacion?: unknown };
  if (typeof r?.venta !== 'number' || !Number.isFinite(r.venta) || r.venta <= 0) {
    throw new Error(`La API no devolvió un precio de venta válido: ${JSON.stringify(respuesta)}`);
  }
  if (typeof r.fechaActualizacion !== 'string') throw new Error('La API no devolvió la fecha de la cotización.');
  return { valor: r.venta, fecha: diaEnArgentina(r.fechaActualizacion), fuente: FUENTE_DEL_BLUE };
}

/**
 * Si hay que actualizar. Un valor menos de la mitad o más del doble que el
 * anterior es más probablemente un error de la API que una corrida cambiaria:
 * se frena y alguien lo mira, en vez de publicarlo.
 */
export function hayQueActualizar(anterior: Cotizacion, nueva: Cotizacion): boolean {
  if (nueva.valor < anterior.valor / 2 || nueva.valor > anterior.valor * 2) {
    throw new Error(`Valor fuera de rango: ${nueva.valor} contra ${anterior.valor} del ${anterior.fecha}.`);
  }
  if (nueva.fecha < anterior.fecha) return false;
  return nueva.valor !== anterior.valor || nueva.fecha !== anterior.fecha;
}

/**
 * Cambia sólo el bloque dolarBlue del texto de parametros.json, sin reformatear
 * el resto: el PR diario tiene que mostrar una diferencia de dos líneas.
 */
export function conDolarBlue(texto: string, c: Cotizacion): string {
  const bloque = /("dolarBlue": \{\s*"valor": )[^,]+(,\s*"fecha": ")[^"]+(",\s*"fuente": ")[^"]+(")/;
  if (!bloque.test(texto)) throw new Error('No encontré el bloque dolarBlue en parametros.json.');
  return texto.replace(bloque, `$1${c.valor}$2${c.fecha}$3${c.fuente}$4`);
}
