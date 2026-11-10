// Un solo cálculo para todo el NEA (RF-43). Donde un valor cambia según la
// provincia, se toma el más alto de la región: así nadie cobra de menos esté
// donde esté, y una provincia nueva en los datos entra sin tocar código.
import type { Datos } from './datos/tipos.ts';

/** La alícuota de ingresos brutos que se aplica sobre el total, y de qué provincia sale. */
export interface IngresosBrutosDelNea {
  alicuota: number;
  provincia: string;
  norma: string;
}

/**
 * La alícuota más alta entre las provincias que cobran sobre lo facturado. El
 * monto fijo por categoría del régimen simplificado de Chaco queda afuera: son
 * unos $ 58 por hora en la categoría A, siempre por debajo de cualquier
 * alícuota sobre el total, y obligaba a pedir la categoría. Sin ninguna
 * alícuota en los datos devuelve undefined: el cálculo lo avisa, no se cae.
 */
export function ingresosBrutosDelNea(datos: Datos): IngresosBrutosDelNea | undefined {
  let elegido: IngresosBrutosDelNea | undefined;
  for (const p of datos.provincias) {
    const iibb = p.ingresosBrutos;
    if (iibb.modo !== 'alicuota') continue;
    if (!elegido || iibb.alicuota > elegido.alicuota) {
      elegido = { alicuota: iibb.alicuota, provincia: p.nombre, norma: iibb.norma };
    }
  }
  return elegido;
}

/** El litro de nafta que se usa para la movilidad, y de qué provincia sale. */
export interface NaftaDelNea {
  precio: number;
  fecha: string;
  provincia: string;
}

/**
 * El precio más alto entre las medianas de las provincias (RN-10). La Action
 * semanal (RF-22) sigue midiendo cada provincia por separado: elegir el mayor
 * es cosa del cálculo, no de los datos. Sin ningún precio devuelve undefined.
 */
export function naftaDelNea(datos: Datos): NaftaDelNea | undefined {
  let elegido: NaftaDelNea | undefined;
  for (const p of datos.provincias) {
    const medicion = datos.combustible.precios[p.id];
    if (!medicion) continue;
    if (!elegido || medicion.precio > elegido.precio) {
      elegido = { precio: medicion.precio, fecha: medicion.fecha, provincia: p.nombre };
    }
  }
  return elegido;
}
