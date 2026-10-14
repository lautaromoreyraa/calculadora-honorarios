// Formato de números para Argentina: punto de miles y coma decimal.

const pesosEnteros = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

const pesosConCentavos = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const numero = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 });

/** $ 1.234 */
export const formatearPesos = (n: number) => pesosEnteros.format(n);

/** $ 1.234,50 */
export const formatearPesosConCentavos = (n: number) => pesosConCentavos.format(n);

/** 1.234,5 */
export const formatearNumero = (n: number) => numero.format(n);

/** 0,4 → 40 % */
export const formatearPorcentaje = (fraccion: number) => `${numero.format(fraccion * 100)} %`;
