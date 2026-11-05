import { describe, expect, it } from 'vitest';
import { archivosNoPermitidos, rutasDeGitStatus, tablaDeCambios } from '../../util/actualizacion/cambios.ts';
import {
  mesSiguiente,
  noEsAnterior,
  numeroPositivo,
  validarMesSiguiente,
  validarVariacion,
} from '../../util/actualizacion/validacion.ts';
import { datos } from '../../util/datos/index.ts';

// RF-23: ningún dato externo llega al sitio sin pasar por estas validaciones, y
// un PR automático que toca algo más que sus datos no se mergea solo.

const { ipc } = datos.parametros.rangosDeVariacion;

describe('RF-23 · validación de datos externos', () => {
  it('frena un IPC 50 % mayor que el del mes anterior', () => {
    expect(() => validarVariacion('IPC NEA', 100, 150, ipc)).toThrow(/fuera de rango/);
  });

  it('deja pasar una variación mensual normal', () => {
    expect(() => validarVariacion('IPC NEA', 100, 103.5, ipc)).not.toThrow();
  });

  it('frena una baja más grande que la permitida', () => {
    expect(() => validarVariacion('IPC NEA', 100, 90, ipc)).toThrow(/fuera de rango/);
  });

  it('exige números positivos, también cuando llegan como texto de un CSV', () => {
    expect(numeroPositivo('245.3', 'IPC')).toBe(245.3);
    expect(() => numeroPositivo('', 'IPC')).toThrow(/número positivo/);
    expect(() => numeroPositivo(null, 'IPC')).toThrow();
    expect(() => numeroPositivo(-1, 'IPC')).toThrow();
    expect(() => numeroPositivo(Number.NaN, 'IPC')).toThrow();
  });

  it('el mes nuevo de un índice tiene que ser el siguiente al último', () => {
    expect(mesSiguiente('2026-09')).toBe('2026-10');
    expect(mesSiguiente('2026-12')).toBe('2027-01');
    expect(() => validarMesSiguiente('IPC', '2026-09', '2026-10')).not.toThrow();
    expect(() => validarMesSiguiente('IPC', '2026-09', '2026-11')).toThrow(/siguiente a 2026-09 es 2026-10/);
    expect(() => validarMesSiguiente('IPC', '2026-09', '2026-09')).toThrow();
  });

  it('no acepta una fecha anterior a la cargada', () => {
    expect(noEsAnterior('2026-10-15', '2026-10-14')).toBe(true);
    expect(noEsAnterior('2026-10-14', '2026-10-14')).toBe(true);
    expect(noEsAnterior('2026-10-13', '2026-10-14')).toBe(false);
  });
});

describe('RF-23 · PR automático', () => {
  it('arma la tabla de valores viejos y nuevos con la variación', () => {
    const tabla = tablaDeCambios([
      { dato: 'IPC NEA 2026-10', anterior: 100, nuevo: 102.5 },
      { dato: 'Salarios 2026-09', anterior: null, nuevo: 300 },
    ]);
    expect(tabla.split('\n')[0]).toBe('| Dato | Anterior | Nuevo | Variación |');
    expect(tabla).toContain('| IPC NEA 2026-10 | 100 | 102,5 | 2,50 % |');
    expect(tabla).toContain('| Salarios 2026-09 | — | 300 | — |');
  });

  it('un PR que toca otro archivo además de los datos de la rutina no se mergea solo', () => {
    const salida = ' M datos/parametros.json\0 M package.json\0';
    expect(archivosNoPermitidos(rutasDeGitStatus(salida), ['datos/parametros.json'])).toEqual(['package.json']);
  });

  it('los datos de la rutina, incluso un archivo nuevo, sí pasan', () => {
    const salida = ' M datos/parametros.json\0?? datos/indices.json\0';
    const rutas = rutasDeGitStatus(salida);
    expect(rutas).toEqual(['datos/parametros.json', 'datos/indices.json']);
    expect(archivosNoPermitidos(rutas, ['datos/parametros.json', 'datos/indices.json'])).toEqual([]);
  });

  it('un archivo con « -> » en el nombre no se hace pasar por uno permitido', () => {
    const salida = '?? x -> datos/parametros.json\0';
    expect(archivosNoPermitidos(rutasDeGitStatus(salida), ['datos/parametros.json'])).toEqual([
      'x -> datos/parametros.json',
    ]);
  });

  it('en un renombre cuentan el origen y el destino', () => {
    const salida = 'R  datos/parametros.json\0package.json\0';
    expect(rutasDeGitStatus(salida)).toEqual(['datos/parametros.json', 'package.json']);
  });
});

describe('RF-23 · rango del dólar', () => {
  // El borde exacto: de la mitad al doble del valor anterior, ambos incluidos.
  const { dolar } = datos.parametros.rangosDeVariacion;
  it('acepta hasta la mitad y hasta el doble, y frena apenas se pasa', () => {
    expect(() => validarVariacion('Dólar', 1000, 500, dolar)).not.toThrow();
    expect(() => validarVariacion('Dólar', 1000, 2000, dolar)).not.toThrow();
    expect(() => validarVariacion('Dólar', 1000, 499, dolar)).toThrow(/fuera de rango/);
    expect(() => validarVariacion('Dólar', 1000, 2001, dolar)).toThrow(/fuera de rango/);
  });
});
