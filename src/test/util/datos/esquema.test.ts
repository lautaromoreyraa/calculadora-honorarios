import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import { describe, expect, it } from 'vitest';

// La verificación corre el esquema sobre los datos reales; estos tests prueban
// que el esquema rechace lo que tiene que rechazar, para que nadie lo afloje sin
// que algo falle.

const raiz = fileURLToPath(new URL('../../../../datos/', import.meta.url));
const leer = (ruta: string) => JSON.parse(readFileSync(ruta, 'utf8'));
const ajv = new Ajv2020({ allErrors: true });
for (const archivo of readdirSync(join(raiz, 'esquema'))) ajv.addSchema(leer(join(raiz, 'esquema', archivo)));

const validar = (esquema: string, datos: unknown) => ajv.getSchema(esquema)!(datos);
const roles = leer(join(raiz, 'roles.json'));
const items = leer(join(raiz, 'items.json'));

const conRol = (cambio: (rol: Record<string, unknown>) => void) => {
  const copia = structuredClone(roles);
  cambio(copia.roles[0]);
  return copia;
};
const conItem = (id: string, cambio: (item: Record<string, unknown>) => void) => {
  const copia = structuredClone(items);
  cambio(copia.items.find((i: { id: string }) => i.id === id));
  return copia;
};

describe('TAR-08 · el esquema exige la escala de los valores de convenio', () => {
  it('acepta los datos actuales', () => {
    expect(validar('roles.schema.json', roles)).toBe(true);
    expect(validar('items.schema.json', items)).toBe(true);
  });

  it('rechaza un rol sin escala, sin origen o con un enlace que no es https', () => {
    expect(validar('roles.schema.json', conRol((r) => delete r.escala))).toBe(false);
    expect(validar('roles.schema.json', conRol((r) => delete (r.escala as Record<string, unknown>).origen))).toBe(false);
    expect(validar('roles.schema.json', conRol((r) => ((r.escala as Record<string, unknown>).fuente = 'http://x.ar')))).toBe(false);
  });

  it('rechaza un ítem con regla «escala» sin origen o sin fuente', () => {
    const sinFuente = conItem('refrigerio', (i) => delete (i.actualizacion as Record<string, unknown>).fuente);
    const sinOrigen = conItem('refrigerio', (i) => delete (i.actualizacion as Record<string, unknown>).origen);
    expect(validar('items.schema.json', sinFuente)).toBe(false);
    expect(validar('items.schema.json', sinOrigen)).toBe(false);
  });
});
