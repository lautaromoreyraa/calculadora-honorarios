import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// RF-17: ningún monto de datos/ puede estar escrito en el código. Si alguien lo
// copia en src/, al actualizarse el dato el código seguiría usando el viejo.

const raiz = fileURLToPath(new URL('../../../../', import.meta.url));

function archivos(carpeta: string): string[] {
  return readdirSync(carpeta, { withFileTypes: true }).flatMap((e) => {
    const ruta = join(carpeta, e.name);
    return e.isDirectory() ? archivos(ruta) : [ruta];
  });
}

/** Todos los números de un JSON, a cualquier profundidad. */
function numeros(valor: unknown): number[] {
  if (typeof valor === 'number') return [valor];
  if (Array.isArray(valor)) return valor.flatMap(numeros);
  if (valor && typeof valor === 'object') return Object.values(valor).flatMap(numeros);
  return [];
}

describe('RF-17 · valores fuera del código', () => {
  it('ningún monto de datos/ aparece en src/ (salvo en los tests)', () => {
    // Desde 1.000: los números chicos (6 horas, 24 meses) son demasiado comunes
    // para buscarlos como texto sin falsos positivos.
    const montos = archivos(join(raiz, 'datos'))
      .filter((a) => a.endsWith('.json') && !a.includes('esquema'))
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
