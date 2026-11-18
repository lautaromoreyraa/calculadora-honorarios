import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { tablaDeCambios, type Cambio } from '../src/util/actualizacion/cambios.ts';
import {
  desde,
  leerCsvDelIndec,
  leerSerieDeDatosGobAr,
  mesesNuevos,
  type IdDeSerie,
  type Indices,
} from '../src/util/indices.ts';

const CSV_DEL_INDEC = 'https://www.indec.gob.ar/ftp/cuadros/economia/serie_ipc_divisiones.csv';
const API_DE_SERIES = 'https://apis.datos.gob.ar/series/api/series/?format=json&limit=1000&start_date=2024-01-01&ids=';
const SERIE_DE_SALARIOS = '149.1_SOR_PRIADO_OCTU_0_25';
const SERIE_DE_RESPALDO_DEL_IPC = '148.3_INIVELNEA_DICI_M_21';

const pedir = async (url: string) => {
  const respuesta = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  if (!respuesta.ok) throw new Error(`${url} respondió ${respuesta.status}.`);
  return respuesta;
};

async function serieDeDatosGobAr(id: string, dato: string) {
  return leerSerieDeDatosGobAr(await (await pedir(API_DE_SERIES + id)).json(), dato);
}

let usoElRespaldo = false;

async function consultarFuentes(): Promise<Record<IdDeSerie, Record<string, number>>> {
  const salarios = await serieDeDatosGobAr(SERIE_DE_SALARIOS, 'Índice de salarios');
  try {
    const texto = new TextDecoder('latin1').decode(await (await pedir(CSV_DEL_INDEC)).arrayBuffer());
    return { ...leerCsvDelIndec(texto), salarios };
  } catch (error) {
    console.error(`::warning::CSV del INDEC: ${String(error).replace(/\s+/g, ' ')} Se usa la API de series para el nivel general.`);
    const general = await serieDeDatosGobAr(SERIE_DE_RESPALDO_DEL_IPC, 'IPC Noreste');
    usoElRespaldo = true;
    return { 'ipc-nea-general': general, 'ipc-nea-comunicacion': {}, salarios };
  }
}

const ruta = new URL('../datos/indices.json', import.meta.url);
const fuentes = await consultarFuentes();
const escribir = (indices: Indices) => writeFileSync(ruta, `${JSON.stringify(indices, null, 2)}\n`);

const inicial = process.argv.indexOf('--inicial');
if (inicial >= 0) {
  const primero = process.argv[inicial + 1];
  const series = JSON.parse(readFileSync(new URL('../datos/indices.json', import.meta.url), 'utf8')).series;
  for (const id of Object.keys(series) as IdDeSerie[]) {
    if (Object.keys(series[id].meses).length > 0) throw new Error(`La serie ${id} ya tiene meses: --inicial es sólo para un archivo vacío.`);
  }
  for (const id of Object.keys(series) as IdDeSerie[]) series[id].meses = desde(fuentes[id], primero);
  escribir({ series });
  console.log(`Carga inicial desde ${primero}.`);
  process.exit(0);
}

const indices: Indices = JSON.parse(readFileSync(ruta, 'utf8'));
const parametros = JSON.parse(readFileSync(new URL('../datos/parametros.json', import.meta.url), 'utf8'));
const rango = (id: IdDeSerie) => parametros.rangosDeVariacion[id === 'salarios' ? 'salarios' : 'ipc'];

const NOMBRE_CORTO: Record<IdDeSerie, string> = {
  'ipc-nea-general': 'IPC NEA',
  'ipc-nea-comunicacion': 'IPC NEA Comunicación',
  salarios: 'salarios',
};

const AVISO_DE_RESPALDO =
  '\n\n**El CSV del INDEC falló:** el nivel general del IPC salió de la API de datos.gob.ar y Comunicación quedó sin actualizar. Revisar el registro de la corrida.';

const cambios: Cambio[] = [];
const resumen: string[] = [];
for (const id of Object.keys(indices.series) as IdDeSerie[]) {
  const serie = indices.series[id];
  const nuevos = mesesNuevos(serie, fuentes[id], rango(id));
  for (const { mes, valor, anterior } of nuevos) {
    serie.meses[mes] = valor;
    cambios.push({ dato: `${serie.nombre}, ${mes}`, anterior, nuevo: valor });
  }
  if (nuevos.length > 0) resumen.push(`${NOMBRE_CORTO[id]} ${nuevos.at(-1)!.mes}`);
  console.log(nuevos.length > 0 ? `${serie.nombre}: ${nuevos.map((n) => n.mes).join(', ')}.` : `${serie.nombre}: sin meses nuevos.`);
}

const cambio = cambios.length > 0;
if (cambio) escribir(indices);

if (process.env.GITHUB_OUTPUT) {
  const b64 = (s: string) => Buffer.from(s).toString('base64');
  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' });
  appendFileSync(
    process.env.GITHUB_OUTPUT,
    [`cambio=${cambio}`, `fecha=${hoy}`, `titulo=${b64(resumen.join(', '))}`, `tabla=${b64(cambio ? tablaDeCambios(cambios) + (usoElRespaldo ? AVISO_DE_RESPALDO : '') : '')}`, ''].join('\n'),
  );
}
