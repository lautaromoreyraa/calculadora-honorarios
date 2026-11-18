import type { Resultado } from './calculo/tipos.ts';
import type { Datos } from './datos/tipos.ts';

export type Parte = 'base' | 'adicionales' | 'impuestos' | 'costos';

export interface PorcionDelTotal {
  parte: Parte;
  nombre: string;
  monto: number;
}

const NOMBRES: Record<Parte, string> = {
  base: 'Honorario base',
  adicionales: 'Adicionales',
  impuestos: 'Impuestos y fondos',
  costos: 'Costos de trabajar',
};

function parteDe(renglonId: string, datos: Datos): Parte {
  const grupo = datos.items.find((i) => i.id === renglonId)?.grupo;
  if (grupo === 'fiscales') return 'impuestos';
  if (grupo === 'operativos') return 'costos';
  if (grupo) return 'adicionales';
  return 'base';
}

export function composicionDelTotal(resultado: Resultado, datos: Datos): PorcionDelTotal[] {
  const montos: Record<Parte, number> = { base: 0, adicionales: 0, impuestos: 0, costos: 0 };
  for (const r of resultado.renglones) montos[parteDe(r.id, datos)] += r.monto;
  montos.impuestos += resultado.ingresosBrutosSobreTotal?.monto ?? 0;
  return (Object.keys(montos) as Parte[])
    .filter((p) => montos[p] > 0)
    .map((parte) => ({ parte, nombre: NOMBRES[parte], monto: montos[parte] }));
}
