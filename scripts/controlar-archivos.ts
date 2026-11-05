// Falla si el árbol de trabajo tiene cambios fuera de los archivos que se
// pasan como argumento (RF-23). Lo corren las Actions de actualización antes
// de abrir el PR automático: si toca otra cosa, no se mergea solo.
// Uso: node scripts/controlar-archivos.ts datos/parametros.json [otro ...]
import { execFileSync } from 'node:child_process';
import { archivosNoPermitidos, rutasDeGitStatus } from '../src/util/actualizacion/cambios.ts';

const permitidos = process.argv.slice(2);
if (permitidos.length === 0) throw new Error('Falta la lista de archivos permitidos.');

const git = (...args: string[]) => execFileSync('git', args, { encoding: 'utf8' });
const cambiados = rutasDeGitStatus(git('status', '--porcelain', '-z', '--untracked-files=all'));
if (cambiados.length === 0) throw new Error('No hay cambios: no debería haberse llegado a este paso.');

const otros = archivosNoPermitidos(cambiados, permitidos);
if (otros.length > 0) {
  console.error(`El PR tocaría archivos que esta rutina no puede cambiar: ${otros.join(', ')}.`);
  process.exit(1);
}

// Una rutina sólo cambia contenido: un cambio de permisos o un archivo que pasa
// a ser un enlace aparece en el resumen del diff y no tiene por qué estar.
const resumen = git('diff', '--summary').trim();
if (resumen !== '') {
  console.error(`El PR cambiaría algo más que el contenido de los datos:\n${resumen}`);
  process.exit(1);
}
console.log(`Cambios sólo en ${cambiados.join(', ')}.`);
