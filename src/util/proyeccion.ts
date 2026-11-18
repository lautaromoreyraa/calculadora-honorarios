import { ultimoMes, type Indices } from './indices.ts';

export interface Proyeccion {
  origen: string;
  porSalarios: number;
  porIpc: number;
  factor: number;
}

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

export function textoDeLaProyeccion(p: Proyeccion, convenio: string): string {
  const [anio, mes] = p.origen.split('-').map(Number);
  const cct = /CCT \d+\/\d+/.exec(convenio)?.[0];
  const escala = `Escala de ${mesLargo.format(new Date(Date.UTC(anio, mes - 1, 1)))}${cct ? ` (${cct})` : ''}`;
  return `${escala} + ${porcentaje(p.porSalarios)} por salarios + ${porcentaje(p.porIpc)} por IPC NEA`;
}
