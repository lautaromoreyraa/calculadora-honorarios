// Lo común a las cotizaciones del dólar que se actualizan solas: el blue
// (RF-29) y el oficial del BCRA (RF-21). Funciones puras: las usa el script de
// la Action diaria, que es el único que consulta las APIs. El sitio lee el
// valor que quedó en datos/parametros.json (RNF-06).
import { noEsAnterior, validarVariacion, type RangoDeVariacion } from './actualizacion/validacion.ts';

export interface Cotizacion {
  valor: number;
  /** Día de la cotización en Argentina, AAAA-MM-DD. */
  fecha: string;
  fuente: string;
}

/** Bloques de parametros.json que guardan una cotización. */
export type ClaveDeCotizacion = 'dolarBlue' | 'dolarOficial';

/**
 * Si hay que actualizar. Un salto fuera del rango configurado (RF-23; para el
 * dólar, menos de la mitad o más del doble) es más probablemente un error de
 * la API que una corrida cambiaria: se frena y alguien lo mira.
 */
export function hayQueActualizar(
  dato: string,
  anterior: Cotizacion,
  nueva: Cotizacion,
  rango: RangoDeVariacion,
): boolean {
  validarVariacion(dato, anterior.valor, nueva.valor, rango);
  if (!noEsAnterior(nueva.fecha, anterior.fecha)) return false;
  return nueva.valor !== anterior.valor || nueva.fecha !== anterior.fecha;
}

/**
 * Cambia sólo el bloque de una cotización en el texto de parametros.json, sin
 * reformatear el resto: el PR diario tiene que mostrar una diferencia mínima.
 */
export function conCotizacion(texto: string, clave: ClaveDeCotizacion, c: Cotizacion): string {
  const bloque = new RegExp(`("${clave}": \\{\\s*"valor": )[^,]+(,\\s*"fecha": ")[^"]+(",\\s*"fuente": ")[^"]+(")`);
  if (!bloque.test(texto)) throw new Error(`No encontré el bloque ${clave} en parametros.json.`);
  return texto.replace(bloque, `$1${c.valor}$2${c.fecha}$3${c.fuente}$4`);
}
