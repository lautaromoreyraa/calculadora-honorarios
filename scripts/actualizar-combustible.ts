import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { validarVariacion } from '../src/util/actualizacion/validacion.ts';
import { tablaDeCambios, type Cambio } from '../src/util/actualizacion/cambios.ts';
import { cambiaElPrecio, conPrecios, CSV_DE_SURTIDORES, medirPorProvincia } from '../src/util/combustible.ts';
import type { PrecioDeCombustible } from '../src/util/datos/tipos.ts';

const leer = (archivo: string) => readFileSync(new URL(`../datos/${archivo}`, import.meta.url), 'utf8');
const ruta = new URL('../datos/combustible.json', import.meta.url);
const texto = readFileSync(ruta, 'utf8');
const combustible = JSON.parse(texto) as { precios: Record<string, PrecioDeCombustible> };
const provincias = Object.fromEntries(
  (JSON.parse(leer('provincias.json')).provincias as { id: string; nombre: string }[]).map((p) => [p.id, p.nombre]),
);
const rango = JSON.parse(leer('parametros.json')).rangosDeVariacion.combustible;

const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' });

async function pedirElCsv(): Promise<string | undefined> {
  try {
    const respuesta = await fetch(CSV_DE_SURTIDORES, { signal: AbortSignal.timeout(120_000) });
    if (respuesta.status >= 500) throw new Error(`respondió ${respuesta.status}`);
    if (!respuesta.ok) throw Object.assign(new Error(`El CSV de surtidores respondió ${respuesta.status}.`), { grave: true });
    return await respuesta.text();
  } catch (error) {
    if ((error as { grave?: boolean }).grave) throw error;
    const motivo = error instanceof Error ? error.message : String(error);
    console.log(`::warning::El sitio de Energía no respondió (${motivo}); se conservan los precios.`);
    return undefined;
  }
}

const csv = await pedirElCsv();
if (csv === undefined) {
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `cambio=false\nfecha=${hoy}\n`);
  process.exit(0);
}
const mediciones = medirPorProvincia(csv, provincias, hoy);

const nuevos: Record<string, PrecioDeCombustible> = {};
const cambios: Cambio[] = [];
for (const [id, medicion] of Object.entries(mediciones)) {
  const anterior = combustible.precios[id];
  if (!anterior) throw new Error(`${provincias[id]} no tiene precio inicial en combustible.json: cargarlo a mano primero.`);
  if ('insuficiente' in medicion) {
    console.log(`${provincias[id]}: sólo ${medicion.estaciones} estaciones; se conserva $ ${anterior.precio}.`);
    continue;
  }
  validarVariacion(`Nafta en ${provincias[id]}`, anterior.precio, medicion.precio, rango);
  if (!cambiaElPrecio(anterior, medicion)) {
    console.log(`${provincias[id]}: sin cambios ($ ${anterior.precio}, ${anterior.estaciones} estaciones).`);
    continue;
  }
  nuevos[id] = { precio: medicion.precio, fecha: hoy, estaciones: medicion.estaciones };
  cambios.push({ dato: `${provincias[id]} (${medicion.estaciones} estaciones)`, anterior: anterior.precio, nuevo: medicion.precio });
  console.log(`${provincias[id]}: $ ${anterior.precio} → $ ${medicion.precio} (${medicion.estaciones} estaciones).`);
}

const cambio = cambios.length > 0;
if (cambio) writeFileSync(ruta, conPrecios(texto, nuevos));

if (process.env.GITHUB_OUTPUT) {
  const b64 = (s: string) => Buffer.from(s).toString('base64');
  const titulo = Object.entries(nuevos).map(([id, p]) => `${provincias[id]} $ ${p.precio}`).join(', ');
  appendFileSync(
    process.env.GITHUB_OUTPUT,
    [`cambio=${cambio}`, `fecha=${hoy}`, `titulo=${b64(titulo)}`, `tabla=${b64(cambio ? tablaDeCambios(cambios) : '')}`, ''].join('\n'),
  );
}
