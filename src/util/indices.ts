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
  meses: Record<string, number>;
}

export interface Indices {
  series: Record<IdDeSerie, Serie>;
}

export function ultimoMes(serie: Serie): string {
  const meses = Object.keys(serie.meses).sort();
  if (meses.length === 0) throw new Error(`La serie «${serie.nombre}» no tiene meses.`);
  return meses[meses.length - 1];
}

export function factorDesde(serie: Serie, origen: string): number {
  const ultimo = ultimoMes(serie);
  if (ultimo <= origen) return 1;
  const base = serie.meses[origen];
  if (base === undefined) throw new Error(`La serie «${serie.nombre}» no tiene el mes ${origen}.`);
  return serie.meses[ultimo] / base;
}


const mesDelIndec = (periodo: string) => `${periodo.slice(0, 4)}-${periodo.slice(4, 6)}`;

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

export function leerSerieDeDatosGobAr(respuesta: unknown, dato: string): Record<string, number> {
  const data = (respuesta as { data?: unknown })?.data;
  if (!Array.isArray(data) || data.length === 0) throw new Error(`${dato}: la API de series no devolvió datos.`);
  for (const fila of data) {
    if (!Array.isArray(fila) || typeof fila[0] !== 'string' || !/^\d{4}-\d{2}-01$/.test(fila[0])) {
      throw new Error(`${dato}: fila con forma inesperada: ${JSON.stringify(fila)}`);
    }
  }
  let fin = data.length;
  while (fin > 0 && (data[fin - 1][1] === null || data[fin - 1][1] === undefined)) fin--;
  if (fin === 0) throw new Error(`${dato}: la API de series no devolvió datos.`);
  const meses: Record<string, number> = {};
  for (const [fecha, valor] of data.slice(0, fin)) {
    meses[fecha.slice(0, 7)] = numeroPositivo(valor, `${dato} ${fecha.slice(0, 7)}`);
  }
  return meses;
}


export interface MesNuevo {
  mes: string;
  valor: number;
  anterior: number;
}

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

export function desde(meses: Record<string, number>, primero: string): Record<string, number> {
  const resultado: Record<string, number> = {};
  for (let mes = primero; meses[mes] !== undefined; mes = mesSiguiente(mes)) resultado[mes] = meses[mes];
  return resultado;
}
