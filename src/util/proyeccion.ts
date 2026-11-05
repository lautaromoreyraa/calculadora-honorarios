// Salario de convenio proyectado desde su escala (RF-35, RN-12). Cada valor de
// convenio se ancla una vez a su escala (TAR-08) y desde ahí se actualiza solo,
// en dos tramos: primero por el índice de salarios del INDEC hasta su último
// mes publicado, y desde ahí por el IPC Noreste hasta el suyo.
//
//   valor = escala × salarios(ms) / salarios(m0) × IPC_NEA(mi) / IPC_NEA(ms)
//
// m0 es el mes de la escala, ms el último del índice de salarios y mi el último
// del IPC NEA. Si el índice de salarios todavía no llega a m0, sólo IPC NEA
// desde m0. Siempre se calcula desde la escala: un mes nuevo de cualquier
// índice no se encadena sobre el valor anterior.
import { ultimoMes, type Indices } from './indices.ts';

export interface Proyeccion {
  /** Mes de la escala (m0). */
  origen: string;
  /** Lo que sumó el índice de salarios, como fracción: 0,012 es 1,2 %. */
  porSalarios: number;
  /** Lo que sumó el IPC NEA después del último mes de salarios. */
  porIpc: number;
  /** Factor total: (1 + porSalarios) × (1 + porIpc). */
  factor: number;
}

/** Cociente de una serie entre dos meses; 1 si el segundo no es posterior al primero. */
function cociente(meses: Record<string, number>, desde: string, hasta: string, nombre: string): number {
  if (hasta <= desde) return 1;
  const base = meses[desde];
  if (base === undefined) throw new Error(`El índice ${nombre} no tiene el mes ${desde}.`);
  return meses[hasta] / base;
}

export function proyectarDesdeEscala(origen: string, indices: Indices): Proyeccion {
  const salarios = indices.series.salarios.meses;
  const ipc = indices.series['ipc-nea-general'].meses;
  const ms = ultimoMes(indices.series.salarios);
  const mi = ultimoMes(indices.series['ipc-nea-general']);

  // Si el índice de salarios no llega a la escala, el IPC arranca en la escala.
  const salariosLlegan = ms >= origen;
  const factorSalarios = salariosLlegan ? cociente(salarios, origen, ms, 'de salarios') : 1;
  const desdeIpc = salariosLlegan ? ms : origen;
  const factorIpc = cociente(ipc, desdeIpc, mi, 'IPC NEA');

  return {
    origen,
    porSalarios: factorSalarios - 1,
    porIpc: factorIpc - 1,
    factor: factorSalarios * factorIpc,
  };
}

const mesLargo = new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const porcentaje = (fraccion: number) =>
  `${(fraccion * 100).toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;

/**
 * La explicación que acompaña al valor hora en la pantalla, el desglose y el
 * Word, para que el profesional pueda justificarlo ante el cliente (RF-19):
 * «Escala de julio de 2026 (CCT 131/75) + 1,2 % por salarios + 3,5 % por IPC NEA».
 */
export function textoDeLaProyeccion(p: Proyeccion, convenio: string): string {
  const [anio, mes] = p.origen.split('-').map(Number);
  const cct = /CCT \d+\/\d+/.exec(convenio)?.[0];
  const escala = `Escala de ${mesLargo.format(new Date(Date.UTC(anio, mes - 1, 1)))}${cct ? ` (${cct})` : ''}`;
  return `${escala} + ${porcentaje(p.porSalarios)} por salarios + ${porcentaje(p.porIpc)} por IPC NEA`;
}
