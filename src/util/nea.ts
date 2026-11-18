import type { Datos } from './datos/tipos.ts';

export interface IngresosBrutosDelNea {
  alicuota: number;
  provincia: string;
  norma: string;
}

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

export interface NaftaDelNea {
  precio: number;
  fecha: string;
  provincia: string;
}

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
