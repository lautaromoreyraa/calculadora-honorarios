import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { tablaDeCambios, type Cambio } from '../src/util/actualizacion/cambios.ts';
import { conCotizacion, hayQueActualizar, type ClaveDeCotizacion, type Cotizacion } from '../src/util/cotizaciones.ts';
import { API_DEL_BLUE, leerRespuesta } from '../src/util/dolar-blue.ts';
import { API_DEL_OFICIAL, leerRespuestaDelBcra } from '../src/util/dolar-oficial.ts';

interface Fuente {
  clave: ClaveDeCotizacion;
  nombre: string;
  api: string;
  leer: (respuesta: unknown) => Cotizacion;
}

const fuentes: Fuente[] = [
  { clave: 'dolarBlue', nombre: 'Dólar blue', api: API_DEL_BLUE, leer: leerRespuesta },
  { clave: 'dolarOficial', nombre: 'Dólar oficial', api: API_DEL_OFICIAL, leer: leerRespuestaDelBcra },
];

const ruta = new URL('../datos/parametros.json', import.meta.url);
let texto = readFileSync(ruta, 'utf8');
const parametros = JSON.parse(texto);

const cambios: Cambio[] = [];
const resumen: string[] = [];
const errores: string[] = [];

for (const fuente of fuentes) {
  const anterior = parametros[fuente.clave] as Cotizacion;
  try {
    const respuesta = await fetch(fuente.api, { signal: AbortSignal.timeout(15_000) });
    if (!respuesta.ok) throw new Error(`La API respondió ${respuesta.status}.`);
    const nueva = fuente.leer(await respuesta.json());
    if (hayQueActualizar(fuente.nombre, anterior, nueva, parametros.rangosDeVariacion.dolar)) {
      texto = conCotizacion(texto, fuente.clave, nueva);
      cambios.push({ dato: `${fuente.nombre} (${nueva.fecha})`, anterior: anterior.valor, nuevo: nueva.valor });
      resumen.push(`${fuente.nombre.toLowerCase()} a $ ${nueva.valor}`);
      console.log(`${fuente.nombre}: $ ${anterior.valor} (${anterior.fecha}) → $ ${nueva.valor} (${nueva.fecha}).`);
    } else {
      console.log(`${fuente.nombre} sin cambios: $ ${anterior.valor} (${anterior.fecha}).`);
    }
  } catch (error) {
    const detalle = error instanceof Error ? error.message : String(error);
    const mensaje = `${fuente.nombre}: ${detalle}`.replace(/\s+/g, ' ');
    errores.push(mensaje);
    console.error(`::error::${mensaje}`);
  }
}

const cambio = cambios.length > 0;
if (cambio) writeFileSync(ruta, texto);

if (process.env.GITHUB_OUTPUT) {
  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' });
  const b64 = (s: string) => Buffer.from(s).toString('base64');
  appendFileSync(
    process.env.GITHUB_OUTPUT,
    [
      `cambio=${cambio}`,
      `fecha=${hoy}`,
      `titulo=${b64(resumen.join(' y '))}`,
      `tabla=${b64(cambio ? tablaDeCambios(cambios) : '')}`,
      `errores=${b64(errores.join('\n'))}`,
      '',
    ].join('\n'),
  );
}
