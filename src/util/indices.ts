// Índices del INDEC que actualizan los montos (RF-20, RN-12): IPC de la región
// Noreste (nivel general y división Comunicación) e índice de salarios
// (registrados, sector privado). Funciones puras: las usa el cálculo, para
// llevar cada monto desde su mes de origen, y el script de la Action, para
// leer las fuentes y sumar los meses nuevos a datos/indices.json.
import {
  mesSiguiente,
  numeroPositivo,
  validarMesSiguiente,
  validarVariacion,
  type RangoDeVariacion,
} from './actualizacion/validacion.ts';

export type IdDeSerie = 'ipc-nea-general' | 'ipc-nea-comunicacion' | 'salarios';

export interface Serie {
  nombre: string;
  fuente: string;
  /** Valor del índice por mes, AAAA-MM. Sin huecos: cada mes es el siguiente del anterior. */
  meses: Record<string, number>;
}

export interface Indices {
  series: Record<IdDeSerie, Serie>;
}

/** Último mes publicado de una serie. */
export function ultimoMes(serie: Serie): string {
  const meses = Object.keys(serie.meses).sort();
  if (meses.length === 0) throw new Error(`La serie «${serie.nombre}» no tiene meses.`);
  return meses[meses.length - 1];
}

/**
 * Cuánto se movió un índice desde el mes de origen de un monto hasta el último
 * publicado (RN-12): `índice_actual / índice_origen`. Si todavía no hay un mes
 * posterior al de origen, el monto vale lo mismo que el día que se cargó.
 */
export function factorDesde(serie: Serie, origen: string): number {
  const ultimo = ultimoMes(serie);
  if (ultimo <= origen) return 1;
  const base = serie.meses[origen];
  if (base === undefined) throw new Error(`La serie «${serie.nombre}» no tiene el mes ${origen}.`);
  return serie.meses[ultimo] / base;
}

// --- Lectura de las fuentes -------------------------------------------------

/** AAAAMM del INDEC a AAAA-MM. */
const mesDelIndec = (periodo: string) => `${periodo.slice(0, 4)}-${periodo.slice(4, 6)}`;

/**
 * El CSV `serie_ipc_divisiones.csv` del INDEC: separado por «;», con coma
 * decimal y una fila por división, región y mes. Devuelve las dos series del
 * Noreste. Si la cabecera cambia, falla: mejor una corrida en rojo que leer la
 * columna equivocada.
 */
export function leerCsvDelIndec(texto: string): Record<'ipc-nea-general' | 'ipc-nea-comunicacion', Record<string, number>> {
  const lineas = texto.replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim() !== '');
  const cabecera = lineas[0]?.split(';').map((c) => c.trim());
  const columna = (nombre: string) => {
    const i = cabecera?.indexOf(nombre) ?? -1;
    if (i < 0) throw new Error(`El CSV del INDEC no tiene la columna ${nombre}: ${lineas[0]}`);
    return i;
  };
  const [codigo, periodo, indice, region] = ['Codigo', 'Periodo', 'Indice_IPC', 'Region'].map(columna);

  const series = { 'ipc-nea-general': {} as Record<string, number>, 'ipc-nea-comunicacion': {} as Record<string, number> };
  for (const linea of lineas.slice(1)) {
    const celdas = linea.split(';');
    if (celdas[region]?.trim() !== 'Noreste') continue;
    const id = celdas[codigo]?.trim() === '0' ? 'ipc-nea-general' : celdas[codigo]?.trim() === '08' ? 'ipc-nea-comunicacion' : null;
    if (!id) continue;
    const mes = mesDelIndec(celdas[periodo].trim());
    series[id][mes] = numeroPositivo(celdas[indice].trim().replace(',', '.'), `IPC ${id} ${mes}`);
  }
  for (const [id, meses] of Object.entries(series)) {
    if (Object.keys(meses).length === 0) throw new Error(`El CSV del INDEC no trae la serie ${id} del Noreste.`);
  }
  return series;
}

/** Una serie de la API de series de datos.gob.ar: `data: [["AAAA-MM-01", valor], ...]`. */
export function leerSerieDeDatosGobAr(respuesta: unknown, dato: string): Record<string, number> {
  const data = (respuesta as { data?: unknown })?.data;
  if (!Array.isArray(data) || data.length === 0) throw new Error(`${dato}: la API de series no devolvió datos.`);
  for (const fila of data) {
    if (!Array.isArray(fila) || typeof fila[0] !== 'string' || !/^\d{4}-\d{2}-01$/.test(fila[0])) {
      throw new Error(`${dato}: fila con forma inesperada: ${JSON.stringify(fila)}`);
    }
  }
  // Los meses vacíos del final son los que todavía no se publicaron: se ignoran,
  // para que una serie atrasada no frene a las otras. Un vacío en el medio
  // (julio de 2026 vino así) es un error: no entra como cero ni se saltea.
  let fin = data.length;
  while (fin > 0 && (data[fin - 1][1] === null || data[fin - 1][1] === undefined)) fin--;
  if (fin === 0) throw new Error(`${dato}: la API de series no devolvió datos.`);
  const meses: Record<string, number> = {};
  for (const [fecha, valor] of data.slice(0, fin)) {
    meses[fecha.slice(0, 7)] = numeroPositivo(valor, `${dato} ${fecha.slice(0, 7)}`);
  }
  return meses;
}

// --- Meses nuevos -----------------------------------------------------------

export interface MesNuevo {
  mes: string;
  valor: number;
  anterior: number;
}

/**
 * Los meses que la fuente trae después del último cargado, validados (RF-23):
 * cada uno es el siguiente del anterior y no se mueve más de lo que admite el
 * rango. Los meses ya cargados no se tocan aunque la fuente los revise: el
 * cálculo parte de ellos y cambiarlos movería montos de meses pasados.
 */
export function mesesNuevos(serie: Serie, deLaFuente: Record<string, number>, rango: RangoDeVariacion): MesNuevo[] {
  let ultimo = ultimoMes(serie);
  let valorAnterior = serie.meses[ultimo];
  const nuevos: MesNuevo[] = [];
  const posteriores = Object.keys(deLaFuente)
    .filter((mes) => mes > ultimo)
    .sort();
  for (const mes of posteriores) {
    validarMesSiguiente(serie.nombre, ultimo, mes);
    const valor = numeroPositivo(deLaFuente[mes], `${serie.nombre} ${mes}`);
    validarVariacion(`${serie.nombre} ${mes}`, valorAnterior, valor, rango);
    nuevos.push({ mes, valor, anterior: valorAnterior });
    ultimo = mes;
    valorAnterior = valor;
  }
  return nuevos;
}

/** Los meses de una serie desde uno dado, para la carga inicial. */
export function desde(meses: Record<string, number>, primero: string): Record<string, number> {
  const resultado: Record<string, number> = {};
  for (let mes = primero; meses[mes] !== undefined; mes = mesSiguiente(mes)) resultado[mes] = meses[mes];
  return resultado;
}
