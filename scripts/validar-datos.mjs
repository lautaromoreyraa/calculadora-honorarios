// Valida cada archivo de datos/ contra su esquema. Corre en la verificación de
// cada PR: un valor mal cargado tiene que frenar el merge, no romper el sitio.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';

const raiz = fileURLToPath(new URL('../datos/', import.meta.url));
const carpetaDeEsquemas = join(raiz, 'esquema');
const leer = (ruta) => JSON.parse(readFileSync(ruta, 'utf8'));

const ajv = new Ajv2020({ allErrors: true });
for (const archivo of readdirSync(carpetaDeEsquemas)) {
  ajv.addSchema(leer(join(carpetaDeEsquemas, archivo)));
}

const archivos = readdirSync(raiz).filter((a) => a.endsWith('.json'));
let errores = 0;
for (const archivo of archivos) {
  const nombreDelEsquema = archivo.replace(/\.json$/, '.schema.json');
  const validar = ajv.getSchema(nombreDelEsquema);
  if (!validar) {
    console.error(`✗ datos/${archivo}: no tiene esquema (falta datos/esquema/${nombreDelEsquema})`);
    errores++;
    continue;
  }
  if (validar(leer(join(raiz, archivo)))) {
    console.log(`✓ datos/${archivo}`);
    continue;
  }
  for (const e of validar.errors) {
    console.error(`✗ datos/${archivo} ${e.instancePath || '/'}: ${e.message}`);
    errores++;
  }
}

if (errores > 0) {
  console.error(`\n${errores} error(es) en los datos.`);
  process.exit(1);
}
