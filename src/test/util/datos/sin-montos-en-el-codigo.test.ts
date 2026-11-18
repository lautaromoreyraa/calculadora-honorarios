import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';


const raiz = fileURLToPath(new URL('../../../../', import.meta.url));

function archivos(carpeta: string): string[] {
  return readdirSync(carpeta, { withFileTypes: true }).flatMap((e) => {
    const ruta = join(carpeta, e.name);
    return e.isDirectory() ? archivos(ruta) : [ruta];
  });
}

const ARCHIVOS_AUTOMATICOS = ['indices.json', 'combustible.json'];
const CLAVES_AUTOMATICAS = new Set(['dolarBlue', 'dolarOficial']);

function numeros(valor: unknown): number[] {
  if (typeof valor === 'number') return [valor];
  if (Array.isArray(valor)) return valor.flatMap(numeros);
  if (valor && typeof valor === 'object') {
    return Object.entries(valor)
      .filter(([clave]) => !CLAVES_AUTOMATICAS.has(clave))
      .flatMap(([, v]) => numeros(v));
  }
  return [];
}

describe('RF-17 · valores fuera del código', () => {
  it('ningún monto de datos/ aparece en src/ (salvo en los tests)', () => {
    const montos = archivos(join(raiz, 'datos'))
      .filter((a) => a.endsWith('.json') && !a.includes('esquema') && !ARCHIVOS_AUTOMATICOS.some((x) => a.endsWith(x)))
      .flatMap((a) => numeros(JSON.parse(readFileSync(a, 'utf8'))))
      .filter((n) => n >= 1000);

    const codigo = archivos(join(raiz, 'src')).filter(
      (a) => /\.(ts|tsx)$/.test(a) && !a.includes(join('src', 'test')),
    );

    const encontrados: string[] = [];
    for (const archivo of codigo) {
      const texto = readFileSync(archivo, 'utf8');
      for (const monto of montos) {
        const formas = [String(monto), monto.toLocaleString('es-AR'), monto.toLocaleString('en-US')];
        if (formas.some((f) => new RegExp(`(?<![\\d.,])${f.replace(/[.,]/g, '\\$&')}(?![\\d])`).test(texto))) {
          encontrados.push(`${relative(raiz, archivo)}: ${monto}`);
        }
      }
    }
    expect(encontrados).toEqual([]);
  });
});
