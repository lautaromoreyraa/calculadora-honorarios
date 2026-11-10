import { describe, expect, it } from 'vitest';
import type { Datos } from '../../util/datos/tipos.ts';
import { datos } from '../../util/datos/index.ts';
import { ingresosBrutosDelNea, naftaDelNea } from '../../util/nea.ts';

// RF-43: donde un valor cambia según la provincia, se toma el más alto del NEA.

describe('RF-43 · ingresos brutos del NEA', () => {
  it('es la alícuota sobre lo facturado más alta: hoy el 3 % de Corrientes', () => {
    expect(ingresosBrutosDelNea(datos)).toMatchObject({ alicuota: 0.03, provincia: 'Corrientes' });
  });

  it('el monto fijo por categoría de Chaco no compite: no es una alícuota', () => {
    const soloChaco: Datos = structuredClone(datos);
    soloChaco.provincias = soloChaco.provincias.filter((p) => p.ingresosBrutos.modo === 'fijo-por-categoria');
    expect(ingresosBrutosDelNea(soloChaco)).toBeUndefined();
  });
});

describe('RF-43 · nafta del NEA', () => {
  it('es el precio más alto entre las provincias, con su fecha', () => {
    const d: Datos = structuredClone(datos);
    d.combustible.precios.chaco = { precio: 2189, fecha: '2026-10-13', estaciones: 15 };
    d.combustible.precios.corrientes = { precio: 2199, fecha: '2026-10-14', estaciones: 14 };
    expect(naftaDelNea(d)).toEqual({ precio: 2199, fecha: '2026-10-14', provincia: 'Corrientes' });
    d.combustible.precios.chaco.precio = 2300;
    expect(naftaDelNea(d)?.provincia).toBe('Chaco');
  });

  it('ignora el precio de una provincia que no está en los datos de provincias', () => {
    const d: Datos = structuredClone(datos);
    d.combustible.precios.misiones = { precio: 9999, fecha: '2026-10-13', estaciones: 20 };
    expect(naftaDelNea(d)?.precio).toBeLessThan(9999);
  });

  it('sin ningún precio no se cae: no hay nafta del NEA', () => {
    const d: Datos = structuredClone(datos);
    d.combustible.precios = {};
    expect(naftaDelNea(d)).toBeUndefined();
  });
});
