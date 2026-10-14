// Trae el dólar blue del día y, si cambió, lo escribe en datos/parametros.json
// (RF-29). Lo corre la GitHub Action diaria; Node 24 ejecuta TypeScript sin
// compilar. No hace commits ni PR: eso lo hace el workflow, que lee la salida
// `cambio` de este script.
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import {
  API_DEL_BLUE,
  conDolarBlue,
  hayQueActualizar,
  leerRespuesta,
  type Cotizacion,
} from '../src/util/dolar-blue.ts';

const ruta = new URL('../datos/parametros.json', import.meta.url);
const texto = readFileSync(ruta, 'utf8');
const anterior = JSON.parse(texto).dolarBlue as Cotizacion;

const respuesta = await fetch(API_DEL_BLUE, { signal: AbortSignal.timeout(15_000) });
if (!respuesta.ok) throw new Error(`La API respondió ${respuesta.status}.`);
const nueva = leerRespuesta(await respuesta.json());

const cambio = hayQueActualizar(anterior, nueva);
if (cambio) writeFileSync(ruta, conDolarBlue(texto, nueva));
console.log(
  cambio
    ? `Dólar blue: $ ${anterior.valor} (${anterior.fecha}) → $ ${nueva.valor} (${nueva.fecha}).`
    : `Dólar blue sin cambios: $ ${anterior.valor} (${anterior.fecha}).`,
);

if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, `cambio=${cambio}\nvalor=${nueva.valor}\nfecha=${nueva.fecha}\n`);
}
