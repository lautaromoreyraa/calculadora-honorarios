// Trae el dólar blue del día y, si cambió, lo escribe en datos/parametros.json
// (RF-29). Lo corre la GitHub Action diaria; Node 24 ejecuta TypeScript sin
// compilar. No hace commits ni PR: eso lo hace el workflow, que lee las salidas
// `cambio` y `tabla` de este script. El valor nuevo pasa antes por la
// validación común de RF-23, con el rango de datos/parametros.json.
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { tablaDeCambios } from '../src/util/actualizacion/cambios.ts';
import {
  API_DEL_BLUE,
  conDolarBlue,
  hayQueActualizar,
  leerRespuesta,
  type Cotizacion,
} from '../src/util/dolar-blue.ts';

const ruta = new URL('../datos/parametros.json', import.meta.url);
const texto = readFileSync(ruta, 'utf8');
const parametros = JSON.parse(texto);
const anterior = parametros.dolarBlue as Cotizacion;

const respuesta = await fetch(API_DEL_BLUE, { signal: AbortSignal.timeout(15_000) });
if (!respuesta.ok) throw new Error(`La API respondió ${respuesta.status}.`);
const nueva = leerRespuesta(await respuesta.json());

const cambio = hayQueActualizar(anterior, nueva, parametros.rangosDeVariacion.dolar);
if (cambio) writeFileSync(ruta, conDolarBlue(texto, nueva));
console.log(
  cambio
    ? `Dólar blue: $ ${anterior.valor} (${anterior.fecha}) → $ ${nueva.valor} (${nueva.fecha}).`
    : `Dólar blue sin cambios: $ ${anterior.valor} (${anterior.fecha}).`,
);

if (process.env.GITHUB_OUTPUT) {
  // La tabla viaja en base64: es de varias líneas y GITHUB_OUTPUT es de una por clave.
  const tabla = tablaDeCambios([{ dato: `Dólar blue (${nueva.fecha})`, anterior: anterior.valor, nuevo: nueva.valor }]);
  appendFileSync(
    process.env.GITHUB_OUTPUT,
    `cambio=${cambio}\nvalor=${nueva.valor}\nfecha=${nueva.fecha}\ntabla=${Buffer.from(tabla).toString('base64')}\n`,
  );
}
