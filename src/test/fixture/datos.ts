import { datos } from '../../util/datos/index.ts';
import type { Datos } from '../../util/datos/tipos.ts';
import type { IdDeSerie, Indices } from '../../util/indices.ts';

// Las Actions cambian los datos todos los días (cotizaciones, índices) y corren
// estos tests antes de publicar. Un test que espera un monto del SRS no puede
// depender de cuánto se movió el IPC desde que se escribió: usa estos datos,
// con los índices cortados antes de cualquier mes de origen.

/** Índices hasta un mes, inclusive. */
export function indicesHasta(mes: string, indices: Indices = datos.indices): Indices {
  const series = structuredClone(indices.series);
  for (const id of Object.keys(series) as IdDeSerie[]) {
    series[id].meses = Object.fromEntries(Object.entries(series[id].meses).filter(([m]) => m <= mes));
  }
  return { series };
}

/**
 * Los datos con cada monto en su valor cargado: los índices cortados en
 * agosto de 2024, el mes de la escala más vieja (conductor). Ni los costos
 * indexados (origen 2026-10) ni los salarios de convenio (RF-35) se mueven.
 */
export const datosAlOrigen: Datos = { ...datos, indices: indicesHasta('2024-08') };

/** Los datos con un mes de índice agregado a cada serie, para probar la actualización. */
export function conMes(mes: string, valores: Partial<Record<IdDeSerie, number>>, base: Datos = datosAlOrigen): Datos {
  const series = structuredClone(base.indices.series);
  for (const [id, valor] of Object.entries(valores) as [IdDeSerie, number][]) series[id].meses[mes] = valor;
  return { ...base, indices: { series } };
}
