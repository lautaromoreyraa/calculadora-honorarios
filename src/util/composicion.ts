// De dónde sale cada peso del total, agrupado en cuatro partes (RNF-13, para
// RF-15): lo que paga el convenio, lo que se le suma, lo que se va en
// impuestos y fondos, y lo que cuesta trabajar. Pura: la barra del resultado
// sólo la dibuja.
import type { Resultado } from './calculo/tipos.ts';
import type { Datos } from './datos/tipos.ts';

export type Parte = 'base' | 'adicionales' | 'impuestos' | 'costos';

export interface PorcionDelTotal {
  parte: Parte;
  nombre: string;
  /** En la moneda del resultado, como los renglones. */
  monto: number;
}

const NOMBRES: Record<Parte, string> = {
  base: 'Honorario base',
  adicionales: 'Adicionales',
  impuestos: 'Impuestos y fondos',
  costos: 'Costos de trabajar',
};

/** El grupo del ítem decide la parte; lo que no es un ítem es el honorario base. */
function parteDe(renglonId: string, datos: Datos): Parte {
  const grupo = datos.items.find((i) => i.id === renglonId)?.grupo;
  if (grupo === 'fiscales') return 'impuestos';
  if (grupo === 'operativos') return 'costos';
  if (grupo) return 'adicionales';
  return 'base';
}

/** Las partes con monto, en un orden fijo. Suman el total del resultado. */
export function composicionDelTotal(resultado: Resultado, datos: Datos): PorcionDelTotal[] {
  const montos: Record<Parte, number> = { base: 0, adicionales: 0, impuestos: 0, costos: 0 };
  for (const r of resultado.renglones) montos[parteDe(r.id, datos)] += r.monto;
  // Ingresos brutos sobre el total (Corrientes) no es un renglón, pero es impuesto.
  montos.impuestos += resultado.ingresosBrutosSobreTotal?.monto ?? 0;
  return (Object.keys(montos) as Parte[])
    .filter((p) => montos[p] > 0)
    .map((parte) => ({ parte, nombre: NOMBRES[parte], monto: montos[parte] }));
}
