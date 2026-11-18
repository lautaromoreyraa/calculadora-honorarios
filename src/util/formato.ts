
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

export const formatearPesos = (n: number) => pesosEnteros.format(n);

export const formatearPesosConCentavos = (n: number) => pesosConCentavos.format(n);

export const formatearNumero = (n: number) => numero.format(n);

export const formatearPorcentaje = (fraccion: number) => `${numero.format(fraccion * 100)} %`;
