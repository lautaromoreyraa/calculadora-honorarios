import { readFileSync, writeFileSync } from 'node:fs';
import { avisosDelMes } from '../src/util/avisos.ts';
import type { Datos } from '../src/util/datos/tipos.ts';

const leer = (archivo: string) => JSON.parse(readFileSync(new URL(`../datos/${archivo}`, import.meta.url), 'utf8'));
const items = leer('items.json');
const datos: Datos = {
  roles: leer('roles.json').roles,
  grupos: items.grupos,
  exclusiones: items.exclusiones,
  items: items.items,
  monotributo: leer('monotributo.json'),
  provincias: leer('provincias.json').provincias,
  combustible: leer('combustible.json'),
  parametros: leer('parametros.json'),
  indices: leer('indices.json'),
};

const [salida, mesPedido] = process.argv.slice(2);
if (!salida) throw new Error('Falta el archivo de salida.');
const mes = mesPedido ?? new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).slice(0, 7);
const avisos = avisosDelMes(mes, datos);
writeFileSync(salida, JSON.stringify(avisos));
console.log(avisos.length > 0 ? `${mes}: ${avisos.map((a) => a.titulo).join('; ')}.` : `${mes}: sin avisos.`);
