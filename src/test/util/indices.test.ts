import { describe, expect, it } from 'vitest';
import { mesSiguiente } from '../../util/actualizacion/validacion.ts';
import { datos } from '../../util/datos/index.ts';
import {
  factorDesde,
  leerCsvDelIndec,
  leerSerieDeDatosGobAr,
  mesesNuevos,
  ultimoMes,
  type IdDeSerie,
  type Serie,
} from '../../util/indices.ts';

// RF-20: los índices del INDEC llegan solos a datos/indices.json, validados, y
// cada costo indexado se calcula desde su mes de origen (RN-12).

const { ipc, salarios } = datos.parametros.rangosDeVariacion;
const serie = (meses: Record<string, number>): Serie => ({ nombre: 'IPC de prueba', fuente: 'test', meses });

// Forma real del CSV del INDEC, ya pasado de Latin-1.
const CSV = [
  'Codigo;Descripcion;Clasificador;Periodo;Indice_IPC;v_m_IPC;v_i_a_IPC;Region',
  '0;NIVEL GENERAL;Nivel general y divisiones COICOP;202608;12404,6845;1,8;37;Noreste',
  '08;Comunicación;Nivel general y divisiones COICOP;202608;11189,4063;1,8;34;Noreste',
  '0;NIVEL GENERAL;Nivel general y divisiones COICOP;202608;11000;1,9;35;GBA',
  '01;Alimentos y bebidas no alcohólicas;Nivel general y divisiones COICOP;202608;13000;2;40;Noreste',
  '0;NIVEL GENERAL;Nivel general y divisiones COICOP;202609;12615,4271;1,7;36,9;Noreste',
  '08;Comunicación;Nivel general y divisiones COICOP;202609;11528,646;3;35,6;Noreste',
].join('\r\n');

describe('RF-20 · lectura de las fuentes', () => {
  it('toma del CSV del INDEC sólo el Noreste, nivel general y Comunicación, con coma decimal', () => {
    expect(leerCsvDelIndec(CSV)).toEqual({
      'ipc-nea-general': { '2026-08': 12404.6845, '2026-09': 12615.4271 },
      'ipc-nea-comunicacion': { '2026-08': 11189.4063, '2026-09': 11528.646 },
    });
  });

  it('falla si el CSV cambia de forma o no trae el Noreste', () => {
    expect(() => leerCsvDelIndec(CSV.replace('Indice_IPC', 'Indice'))).toThrow(/columna Indice_IPC/);
    expect(() => leerCsvDelIndec(CSV.replaceAll('Noreste', 'NEA'))).toThrow(/Noreste/);
    expect(() => leerCsvDelIndec(CSV.replace('12615,4271', 'NA'))).toThrow(/número positivo/);
  });

  it('lee una serie de datos.gob.ar y no acepta un mes vacío', () => {
    expect(leerSerieDeDatosGobAr({ data: [['2026-06-01', 9662.3], ['2026-07-01', 9879.87]] }, 'Salarios')).toEqual({
      '2026-06': 9662.3,
      '2026-07': 9879.87,
    });
    // Julio de 2026 vino vacío en la API con agosto publicado: eso no puede entrar como un cero.
    expect(() => leerSerieDeDatosGobAr({ data: [['2026-06-01', 1], ['2026-07-01', null], ['2026-08-01', 2]] }, 'IPC')).toThrow(
      /número positivo/,
    );
    expect(() => leerSerieDeDatosGobAr({ data: [] }, 'IPC')).toThrow(/no devolvió datos/);
    expect(() => leerSerieDeDatosGobAr({ data: [['2026-07-01', null]] }, 'IPC')).toThrow(/no devolvió datos/);
  });

  it('ignora los meses vacíos del final: todavía no se publicaron', () => {
    expect(leerSerieDeDatosGobAr({ data: [['2026-06-01', 9662.3], ['2026-07-01', null]] }, 'Salarios')).toEqual({
      '2026-06': 9662.3,
    });
  });
});

describe('RF-20 · meses nuevos', () => {
  const cargada = serie({ '2026-08': 100, '2026-09': 102 });

  it('suma los meses siguientes al último, en orden, con su valor anterior', () => {
    expect(mesesNuevos(cargada, { '2026-09': 999, '2026-10': 104, '2026-11': 105 }, ipc)).toEqual([
      { mes: '2026-10', valor: 104, anterior: 102 },
      { mes: '2026-11', valor: 105, anterior: 104 },
    ]);
  });

  it('sin mes nuevo no hay nada que sumar (y no hay PR)', () => {
    expect(mesesNuevos(cargada, { '2026-08': 100, '2026-09': 102 }, ipc)).toEqual([]);
  });

  it('un mes que no es el siguiente al último falla a la vista', () => {
    expect(() => mesesNuevos(cargada, { '2026-11': 105 }, ipc)).toThrow(/siguiente a 2026-09 es 2026-10/);
  });

  it('un IPC 50 % mayor que el del mes anterior falla (RF-23)', () => {
    expect(() => mesesNuevos(cargada, { '2026-10': 153 }, ipc)).toThrow(/fuera de rango/);
  });

  it('los salarios usan su propio rango', () => {
    expect(() => mesesNuevos(cargada, { '2026-10': 102 * (1 + salarios.maximaSubida) + 1 }, salarios)).toThrow(/fuera de rango/);
  });
});

describe('RN-12 · factor desde el origen', () => {
  const s = serie({ '2026-09': 200, '2026-10': 210, '2026-11': 220 });

  it('es el último índice sobre el del mes de origen', () => {
    expect(factorDesde(s, '2026-09')).toBeCloseTo(1.1, 10);
    expect(factorDesde(s, '2026-10')).toBeCloseTo(220 / 210, 10);
  });

  it('vale 1 mientras no haya un mes posterior al de origen', () => {
    expect(factorDesde(s, '2026-11')).toBe(1);
    expect(factorDesde(s, '2026-12')).toBe(1);
  });

  it('falla si el mes de origen quedó fuera de la serie', () => {
    expect(() => factorDesde(s, '2026-01')).toThrow(/no tiene el mes 2026-01/);
  });
});

describe('RF-20 · datos/indices.json', () => {
  const ids = Object.keys(datos.indices.series) as IdDeSerie[];

  it('cada serie es continua: ningún mes salteado', () => {
    for (const id of ids) {
      const meses = Object.keys(datos.indices.series[id].meses).sort();
      for (let i = 1; i < meses.length; i++) expect(meses[i], id).toBe(mesSiguiente(meses[i - 1]));
    }
  });

  it('arranca a más tardar en agosto de 2024, la escala más vieja (conductor, TAR-08)', () => {
    for (const id of ids) expect(Object.keys(datos.indices.series[id].meses).sort()[0] <= '2024-08', id).toBe(true);
  });

  it('cada costo indexado tiene su mes de origen en la serie, o es posterior al último publicado', () => {
    for (const item of datos.items.filter((i) => i.actualizacion.regla === 'ipc-nea')) {
      const { origen, serie: cual } = item.actualizacion;
      const s = datos.indices.series[cual === 'general' ? 'ipc-nea-general' : 'ipc-nea-comunicacion'];
      expect(() => factorDesde(s, origen!), item.id).not.toThrow();
      if (origen! <= ultimoMes(s)) expect(s.meses[origen!], item.id).toBeDefined();
    }
  });

  it('conectividad y datos móviles van por Comunicación; ART y seguro, por el nivel general (RN-13)', () => {
    const serieDe = (id: string) => datos.items.find((i) => i.id === id)?.actualizacion.serie;
    expect(serieDe('conectividad')).toBe('comunicacion');
    expect(serieDe('datos-moviles')).toBe('comunicacion');
    expect(serieDe('art')).toBe('general');
    expect(serieDe('seguro-equipamiento')).toBe('general');
  });
});
