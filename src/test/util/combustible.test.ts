import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { cambiaElPrecio, celdasDeCsv, conPrecios, medirPorProvincia, nombreEnElCsv } from '../../util/combustible.ts';

// RF-22: la Action semanal deja por provincia la mediana del precio diurno de la
// nafta súper de los últimos 60 días, con cuántas estaciones lo informaron.

const CABECERA =
  'indice_tiempo,idempresa,cuit,empresa,direccion,localidad,provincia,region,idproducto,producto,idtipohorario,tipohorario,precio,fecha_vigencia,idempresabandera,empresabandera,latitud,longitud,geojson';
const fila = (estacion: number, provincia: string, precio: number, fecha = '2026-10-20', producto = '2', horario = 'Diurno') =>
  `2026-10,${estacion},30-1,EST ${estacion},"Calle 1, Nº ${estacion}",RESISTENCIA,${provincia},NEA,${producto},Nafta (sper) entre 92 y 95 Ron,2,${horario},${precio},${fecha} 10:00:00,1,YPF,-27,-59,"{""type"":""Point"",""coordinates"":[-59,-27]}"`;
const csv = (filas: string[]) => '\uFEFF' + [CABECERA, ...filas].join('\r\n');
const provincias = { chaco: 'Chaco', corrientes: 'Corrientes' };
const HOY = '2026-11-05';

describe('RF-22 · nafta desde los surtidores', () => {
  it('lee campos entre comillas con comas y comillas dobladas adentro', () => {
    expect(celdasDeCsv('a,"b, c","{""x"":1}",d')).toEqual(['a', 'b, c', '{"x":1}', 'd']);
  });

  it('pasa el nombre de la provincia al del CSV', () => {
    expect(nombreEnElCsv('Entre Ríos')).toBe('ENTRE RIOS');
  });

  it('mediana del precio diurno de la nafta súper, una vez por estación', () => {
    const filas = [
      ...[2100, 2150, 2189, 2200, 2250].map((p, i) => fila(i + 1, 'CHACO', p)),
      fila(1, 'CHACO', 2000, '2026-09-30'), // la misma estación informó antes: cuenta la última
      fila(9, 'CHACO', 9999, '2026-10-20', '19'), // gasoil
      fila(10, 'CHACO', 9999, '2026-10-20', '2', 'Nocturno'),
      fila(11, 'CHACO', 1, '2026-08-01'), // más de 60 días
      ...[2199, 2199, 2210, 2190, 2205, 2199].map((p, i) => fila(20 + i, 'CORRIENTES', p)),
    ];
    expect(medirPorProvincia(csv(filas), provincias, HOY)).toEqual({
      chaco: { precio: 2189, estaciones: 5 },
      corrientes: { precio: 2199, estaciones: 6 },
    });
  });

  it('con menos de 5 estaciones no hay precio: se conserva el anterior', () => {
    const filas = [2100, 2150, 2189, 2200].map((p, i) => fila(i + 1, 'CHACO', p));
    const medicion = medirPorProvincia(csv(filas), provincias, HOY);
    expect(medicion.chaco).toEqual({ estaciones: 4, insuficiente: true });
    expect(cambiaElPrecio({ precio: 2189, fecha: '2026-10-13', estaciones: 15 }, medicion.chaco)).toBe(false);
  });

  it('falla si el CSV cambia de forma', () => {
    expect(() => medirPorProvincia(csv([]).replace(',tipohorario,', ',horario,'), provincias, HOY)).toThrow(/tipohorario/);
  });

  it('actualiza sólo la línea de la provincia en combustible.json', () => {
    const texto = readFileSync(new URL('../../../datos/combustible.json', import.meta.url), 'utf8');
    const nuevo = conPrecios(texto, { chaco: { precio: 2300, fecha: '2026-11-05', estaciones: 16 } });
    expect(JSON.parse(nuevo).precios.chaco).toEqual({ precio: 2300, fecha: '2026-11-05', estaciones: 16 });
    expect(JSON.parse(nuevo).precios.corrientes).toEqual(JSON.parse(texto).precios.corrientes);
    expect(nuevo.split('\n').filter((l, i) => l !== texto.split('\n')[i])).toHaveLength(1);
  });
});
