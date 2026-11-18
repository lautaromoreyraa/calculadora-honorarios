import type { PrecioDeCombustible } from './datos/tipos.ts';

export const CSV_DE_SURTIDORES =
  'http://datos.energia.gob.ar/dataset/1c181390-5045-475e-94dc-410429be4b17/resource/80ac25de-a44a-4445-9215-090cf55cfda5/download/precios-en-surtidor-resolucin-3142016.csv';

const ID_NAFTA_SUPER = '2';
const DIAS = 60;
export const MINIMO_DE_ESTACIONES = 5;

export function celdasDeCsv(linea: string): string[] {
  const celdas: string[] = [];
  let actual = '';
  let entreComillas = false;
  for (let i = 0; i < linea.length; i++) {
    const c = linea[i];
    if (entreComillas) {
      if (c === '"' && linea[i + 1] === '"') {
        actual += '"';
        i++;
      } else if (c === '"') entreComillas = false;
      else actual += c;
    } else if (c === '"') entreComillas = true;
    else if (c === ',') {
      celdas.push(actual);
      actual = '';
    } else actual += c;
  }
  celdas.push(actual);
  return celdas;
}

const mediana = (valores: number[]) => {
  const v = [...valores].sort((a, b) => a - b);
  const medio = Math.floor(v.length / 2);
  return v.length % 2 === 1 ? v[medio] : (v[medio - 1] + v[medio]) / 2;
};

export const nombreEnElCsv = (nombre: string) =>
  nombre.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();

export type Medicion = { precio: number; estaciones: number } | { estaciones: number; insuficiente: true };

export function medirPorProvincia(texto: string, provincias: Record<string, string>, hoy: string): Record<string, Medicion> {
  const lineas = texto.replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim() !== '');
  const cabecera = celdasDeCsv(lineas[0] ?? '');
  const columna = (nombre: string) => {
    const i = cabecera.indexOf(nombre);
    if (i < 0) throw new Error(`El CSV de surtidores no tiene la columna ${nombre}.`);
    return i;
  };
  const [estacion, provincia, producto, horario, precio, vigencia] = [
    'idempresa', 'provincia', 'idproducto', 'tipohorario', 'precio', 'fecha_vigencia',
  ].map(columna);

  const limite = new Date(`${hoy}T00:00:00Z`);
  limite.setUTCDate(limite.getUTCDate() - DIAS);
  const desde = limite.toISOString().slice(0, 10);
  const idDe = new Map(Object.entries(provincias).map(([id, nombre]) => [nombreEnElCsv(nombre), id]));

  const porProvincia = new Map<string, Map<string, { fecha: string; precio: number }>>();
  for (const linea of lineas.slice(1)) {
    const c = celdasDeCsv(linea);
    const id = idDe.get(c[provincia]?.trim());
    if (!id || c[producto] !== ID_NAFTA_SUPER || c[horario] !== 'Diurno') continue;
    const fecha = c[vigencia]?.slice(0, 10) ?? '';
    const valor = Number(c[precio]);
    if (fecha < desde || fecha > hoy || !Number.isFinite(valor) || valor <= 0) continue;
    const estaciones = porProvincia.get(id) ?? new Map();
    const anterior = estaciones.get(c[estacion]);
    if (!anterior || anterior.fecha < fecha) estaciones.set(c[estacion], { fecha, precio: valor });
    porProvincia.set(id, estaciones);
  }

  const resultado: Record<string, Medicion> = {};
  for (const id of Object.keys(provincias)) {
    const precios = [...(porProvincia.get(id)?.values() ?? [])].map((e) => e.precio);
    resultado[id] =
      precios.length < MINIMO_DE_ESTACIONES
        ? { estaciones: precios.length, insuficiente: true }
        : { precio: Math.round(mediana(precios)), estaciones: precios.length };
  }
  return resultado;
}

export function cambiaElPrecio(anterior: PrecioDeCombustible, medicion: Medicion): boolean {
  return !('insuficiente' in medicion) && (medicion.precio !== anterior.precio || medicion.estaciones !== anterior.estaciones);
}

export function conPrecios(texto: string, precios: Record<string, PrecioDeCombustible>): string {
  let nuevo = texto;
  for (const [id, p] of Object.entries(precios)) {
    const linea = new RegExp(`("${id}": )\\{[^}]*\\}`);
    if (!linea.test(nuevo)) throw new Error(`No encontré la provincia ${id} en combustible.json.`);
    nuevo = nuevo.replace(linea, `$1{ "precio": ${p.precio}, "fecha": "${p.fecha}", "estaciones": ${p.estaciones} }`);
  }
  return nuevo;
}
