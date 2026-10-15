// En qué moneda se muestran los montos (RF-28). Todo se calcula en pesos, que
// es como están los datos; en dólares, cada monto se divide por la cotización
// del blue y se redondea a centavos. El motor recibe un Formato y no sabe de
// dónde salió la cotización.
import type { Datos } from './datos/tipos.ts';
import { formatearPesos, formatearPesosConCentavos } from './formato.ts';

export type Moneda = 'ARS' | 'USD';

export interface Cotizacion {
  valor: number;
  fecha: string;
  fuente: string;
}

export interface Formato {
  moneda: Moneda;
  /** Pesos por unidad de la moneda: 1 en pesos, la cotización en dólares. */
  factor: number;
  /** La cotización usada, si no es en pesos: la pantalla y el Word la citan. */
  cotizacion?: Cotizacion;
  /** Redondeo de un monto ya convertido (RN-11): a pesos enteros o a centavos de dólar. */
  redondear: (n: number) => number;
  /** Un monto ya en esta moneda: en pesos, enteros. */
  monto: (n: number) => string;
  /** Idem, con centavos: el valor hora. */
  montoConCentavos: (n: number) => string;
  /** Un monto en pesos, convertido a esta moneda. */
  desdePesos: (pesos: number) => string;
  /** Idem, con centavos: valores hora, precios por litro. */
  desdePesosConCentavos: (pesos: number) => string;
}

const dolares = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const EN_PESOS: Formato = {
  moneda: 'ARS',
  factor: 1,
  redondear: Math.round,
  monto: formatearPesos,
  montoConCentavos: formatearPesosConCentavos,
  desdePesos: formatearPesos,
  desdePesosConCentavos: formatearPesosConCentavos,
};

export function enDolares(cotizacion: Cotizacion): Formato {
  // Sumar centavos en coma flotante deja colas (0,1 + 0,2): se redondea siempre.
  const aCentavos = (n: number) => Math.round(n * 100) / 100;
  return {
    moneda: 'USD',
    factor: cotizacion.valor,
    cotizacion,
    redondear: aCentavos,
    monto: (n) => dolares.format(n),
    montoConCentavos: (n) => dolares.format(n),
    desdePesos: (pesos) => dolares.format(pesos / cotizacion.valor),
    desdePesosConCentavos: (pesos) => dolares.format(pesos / cotizacion.valor),
  };
}

/** El formato en que quedó un resultado del motor: el Word lo usa para escribir el total. */
export function formatoDe(resultado: { moneda: Moneda; cotizacion?: Cotizacion }): Formato {
  return resultado.moneda === 'USD' && resultado.cotizacion ? enDolares(resultado.cotizacion) : EN_PESOS;
}

/** El formato de la moneda elegida, con la cotización del blue de los datos (RF-29). */
export function formatoPara(moneda: Moneda, datos: Datos): Formato {
  return moneda === 'USD' ? enDolares(datos.parametros.dolarBlue) : EN_PESOS;
}
