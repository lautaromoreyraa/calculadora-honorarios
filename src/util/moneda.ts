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
  factor: number;
  cotizacion?: Cotizacion;
  redondear: (n: number) => number;
  monto: (n: number) => string;
  montoConCentavos: (n: number) => string;
  desdePesos: (pesos: number) => string;
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

export function formatoDe(resultado: { moneda: Moneda; cotizacion?: Cotizacion }): Formato {
  return resultado.moneda === 'USD' && resultado.cotizacion ? enDolares(resultado.cotizacion) : EN_PESOS;
}

export function formatoPara(moneda: Moneda, datos: Datos): Formato {
  return moneda === 'USD' ? enDolares(datos.parametros.dolarBlue) : EN_PESOS;
}
