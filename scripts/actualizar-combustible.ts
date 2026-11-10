// Actualiza el precio de la nafta súper por provincia (RF-22) desde el CSV de
// precios vigentes de la Secretaría de Energía. Lo corre la GitHub Action
// semanal; Node 24 ejecuta TypeScript sin compilar. No hace commits ni PR: eso
// lo hace el workflow, con las salidas `cambio`, `titulo` y `tabla`.
//
// Una provincia con menos de 5 estaciones conserva su precio anterior. Un
// salto fuera del rango de RF-23 o un CSV con otra forma frenan la corrida:
// no se escribe nada y queda en rojo. El PR no se mergea solo: el CSV llega
// por http y lo revisa una persona (ver combustible.yml).
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

const respuesta = await fetch(CSV_DE_SURTIDORES, { signal: AbortSignal.timeout(120_000) });
if (!respuesta.ok) throw new Error(`El CSV de surtidores respondió ${respuesta.status}.`);
const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' });
const mediciones = medirPorProvincia(await respuesta.text(), provincias, hoy);

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
