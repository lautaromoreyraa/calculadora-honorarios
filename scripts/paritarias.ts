// Busca señales de paritarias nuevas (RF-40) y escribe en un JSON los avisos a
// abrir. Lo corre la Action semanal, que le pasa los issues de paritarias ya
// abiertos o cerrados (la memoria entre semanas) y abre los que el script
// devuelve. No toca datos/ ni abre PR, y no tiene credenciales.
//
// Uso: node scripts/paritarias.ts <historia.json> <salida.json>
//   historia.json: [{ "body": "..." }, ...] de `gh issue list --label paritarias`.
//   salida.json: { base, avisos, errores }. Sin historia, la primera corrida
//   devuelve una línea de base con todo lo que hay hoy, para no avisar de cada
//   escala vieja.
import { readFileSync, writeFileSync } from 'node:fs';
import type { Aviso } from '../src/util/avisos.ts';
import {
  avisosDeParitarias,
  avisosDeTrabajo,
  BOLETIN,
  conveniosAVigilar,
  conveniosNombrados,
  enlacesDeEscalas,
  enlacesNuevos,
  PAGINAS_DE_ESCALAS,
  textoPlano,
  type Hallazgo,
} from '../src/util/paritarias.ts';

const [rutaHistoria, rutaSalida] = process.argv.slice(2);
if (!rutaHistoria || !rutaSalida) throw new Error('Uso: node scripts/paritarias.ts <historia.json> <salida.json>');

const historia = (JSON.parse(readFileSync(rutaHistoria, 'utf8')) as { body: string }[]).map((i) => i.body);
const roles = JSON.parse(readFileSync(new URL('../datos/roles.json', import.meta.url), 'utf8')).roles;
const convenios = conveniosAVigilar(roles);
const errores: string[] = [];
const hallazgos: Hallazgo[] = [];
const todos: string[] = [];

const pedir = async (url: string) => {
  const r = await fetch(url, { signal: AbortSignal.timeout(60_000), headers: { 'User-Agent': 'calculadora-honorarios (RF-40)' } });
  if (!r.ok) throw new Error(`${url} respondió ${r.status}.`);
  // Tope de 2 MB: las regex corren sobre HTML de terceros, y una página enorme o rota no puede trabar la corrida.
  return (await r.text()).slice(0, 2_000_000);
};
/** El sitio no contestó: conexión rechazada o cortada, demora, o un error 5xx del servidor. */
const sinRespuesta = (error: unknown) =>
  error instanceof Error && (/fetch failed|aborted|timeout/i.test(error.message) || / respondió 5\d\d\.$/.test(error.message));
const anotar = (fuente: string, error: unknown) => {
  const mensaje = `${fuente}: ${String(error instanceof Error ? error.message : error).replace(/\s+/g, ' ')}`;
  errores.push(mensaje);
  console.error(`::warning::${mensaje}`);
};

// Boletín Oficial: la primera sección de los últimos 7 días. El sitio no atiende
// a los servidores de GitHub ni de Cloudflare (RF-48): si no responde, se avisa
// una vez, se sigue con los sindicatos y la corrida no queda en rojo por eso.
// Una respuesta con error (un 4xx, una página que cambió) sí cuenta como error.
let boletinSinRespuesta = false;
for (let atras = 0; atras < 7 && !boletinSinRespuesta; atras++) {
  const dia = new Date(Date.now() - atras * 86_400_000)
    .toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' })
    .replaceAll('-', '');
  try {
    for (const aviso of avisosDeTrabajo(await pedir(`${BOLETIN}/seccion/primera/${dia}`))) {
      todos.push(aviso.url);
      if (historia.some((h) => h.includes(aviso.url))) continue;
      for (const convenio of conveniosNombrados(textoPlano(await pedir(aviso.url)), convenios)) {
        hallazgos.push({ convenio, origen: `Boletín Oficial: ${aviso.titulo}`, enlaces: [aviso.url] });
      }
    }
  } catch (error) {
    if (sinRespuesta(error)) {
      boletinSinRespuesta = true;
      console.log(`::warning::El Boletín Oficial no respondió (${(error as Error).message}); esta semana se miran sólo los sindicatos.`);
    } else {
      anotar(`Boletín Oficial del ${dia}`, error);
    }
  }
}

// Páginas de escalas de los sindicatos.
for (const pagina of PAGINAS_DE_ESCALAS) {
  try {
    const enlaces = enlacesDeEscalas(await pedir(pagina.url), pagina.url);
    todos.push(...enlaces);
    const nuevos = enlacesNuevos(enlaces, historia);
    if (nuevos.length > 0) hallazgos.push({ convenio: pagina.convenio, origen: `Página de escalas de ${pagina.sindicato}`, enlaces: nuevos });
  } catch (error) {
    anotar(pagina.sindicato, error);
  }
}

const base = historia.length === 0;
const avisos: Aviso[] = base
  ? [
      {
        etiqueta: 'paritarias-base',
        titulo: 'Línea de base de los avisos de paritarias',
        cuerpo: ['Lo que había al empezar a vigilar (RF-40). Se cierra sola: desde acá se avisa sólo lo nuevo.', '', ...todos.map((e) => `- ${e}`)].join('\n'),
      },
    ]
  : avisosDeParitarias(hallazgos);

writeFileSync(rutaSalida, JSON.stringify({ base, avisos, errores }));
console.log(base ? `Línea de base con ${todos.length} enlaces.` : `${avisos.length} aviso(s); ${errores.length} fuente(s) con error.`);
