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

const resumen = git('diff', '--summary').trim();
if (resumen !== '') {
  console.error(`El PR cambiaría algo más que el contenido de los datos:\n${resumen}`);
  process.exit(1);
}
console.log(`Cambios sólo en ${cambiados.join(', ')}.`);
