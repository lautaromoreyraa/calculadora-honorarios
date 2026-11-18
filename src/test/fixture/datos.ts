import { datos } from '../../util/datos/index.ts';
import type { Datos } from '../../util/datos/tipos.ts';
import type { IdDeSerie, Indices } from '../../util/indices.ts';


export function indicesHasta(mes: string, indices: Indices = datos.indices): Indices {
  const series = structuredClone(indices.series);
  for (const id of Object.keys(series) as IdDeSerie[]) {
    series[id].meses = Object.fromEntries(Object.entries(series[id].meses).filter(([m]) => m <= mes));
  }
  return { series };
}

export const datosAlOrigen: Datos = { ...datos, indices: indicesHasta('2024-08') };

export function conMes(mes: string, valores: Partial<Record<IdDeSerie, number>>, base: Datos = datosAlOrigen): Datos {
  const series = structuredClone(base.indices.series);
  for (const [id, valor] of Object.entries(valores) as [IdDeSerie, number][]) series[id].meses[mes] = valor;
  return { ...base, indices: { series } };
}
