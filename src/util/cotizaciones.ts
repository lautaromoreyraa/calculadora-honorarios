import { noEsAnterior, validarVariacion, type RangoDeVariacion } from './actualizacion/validacion.ts';

export interface Cotizacion {
  valor: number;
  fecha: string;
  fuente: string;
}

export type ClaveDeCotizacion = 'dolarBlue' | 'dolarOficial';

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

export function conCotizacion(texto: string, clave: ClaveDeCotizacion, c: Cotizacion): string {
  const bloque = new RegExp(`("${clave}": \\{\\s*"valor": )[^,]+(,\\s*"fecha": ")[^"]+(",\\s*"fuente": ")[^"]+(")`);
  if (!bloque.test(texto)) throw new Error(`No encontré el bloque ${clave} en parametros.json.`);
  return texto.replace(bloque, `$1${c.valor}$2${c.fecha}$3${c.fuente}$4`);
}
