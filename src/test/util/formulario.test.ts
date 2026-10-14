import { describe, expect, it } from 'vitest';
import { datos } from '../../util/datos/index.ts';
import { calcular } from '../../util/calculo/index.ts';
import { formatearPesos } from '../../util/formato.ts';
import {
  aSeleccion,
  camposDeItem,
  estadoInicial,
  formatearFecha,
  formatearVigencia,
  leerNumero,
  resumenDelItem,
  valorHoraDelRol,
  vigenciaDeLosDatos,
  type EstadoDelFormulario,
} from '../../util/formulario.ts';

const item = (id: string) => datos.items.find((i) => i.id === id)!;

const estado = (cambios: Partial<EstadoDelFormulario> = {}): EstadoDelFormulario => ({
  ...estadoInicial(datos),
  horas: '10',
  elegidos: { plazo: null, 'tipo-de-cliente': 'cliente-a' },
  ...cambios,
});

describe('leerNumero', () => {
  it.each([
    ['10', 10],
    ['1,5', 1.5],
    ['1.5', 1.5],
    ['2.400.000', 2400000],
    ['1.500', 1500],
    ['1.25', 1.25],
    ['2.400.000,50', 2400000.5],
    ['$ 25000', 25000],
    [' 7 ', 7],
  ])('«%s» es %s', (texto, esperado) => {
    expect(leerNumero(texto)).toBe(esperado);
  });

  it.each(['', 'abc', '1,2,3', undefined])('«%s» no es un número', (texto) => {
    expect(leerNumero(texto)).toBeNaN();
  });
});

describe('estadoInicial', () => {
  it('arranca con el primer rol, provincia y categoría de los datos, sin horas ni opciones elegidas', () => {
    const e = estadoInicial(datos);
    expect(e.rolId).toBe(datos.roles[0].id);
    expect(e.provinciaId).toBe(datos.provincias[0].id);
    expect(e.categoria).toBe(datos.monotributo.categorias[0].letra);
    expect(e.horas).toBe('');
    expect(Object.values(e.elegidos).every((v) => v === null)).toBe(true);
  });

  it('sin horas el motor no calcula', () => {
    expect(calcular(aSeleccion(estadoInicial(datos), datos), datos).ok).toBe(false);
  });
});

describe('camposDeItem', () => {
  it('cada ítem pide lo que su fórmula necesita', () => {
    expect(camposDeItem(item('alquiler-kit-liviano'))).toEqual(['monto']);
    expect(camposDeItem(item('amortizacion-kit-profesional'))).toEqual(['precio']);
    expect(camposDeItem(item('movilidad'))).toEqual(['km', 'consumo']);
    expect(camposDeItem(item('conectividad'))).toEqual([]);
  });
});

describe('aSeleccion', () => {
  it('lleva las casillas marcadas y la opción elegida de cada conjunto excluyente', () => {
    const s = aSeleccion(
      estado({ marcados: { conectividad: true, titulo: false }, elegidos: { plazo: 'urgente', 'tipo-de-cliente': 'cliente-d' } }),
      datos,
    );
    expect(Object.keys(s.items).sort()).toEqual(['cliente-d', 'conectividad', 'urgente']);
  });

  it('convierte horas y antigüedad escritas con coma', () => {
    const s = aSeleccion(estado({ horas: '7,5', antiguedad: '3' }), datos);
    expect(s.horas).toBe(7.5);
    expect(s.antiguedad).toBe(3);
  });

  it('antigüedad vacía cuenta como cero', () => {
    expect(aSeleccion(estado({ antiguedad: '' }), datos).antiguedad).toBe(0);
  });

  it('pasa los datos de cada ítem y omite los vacíos', () => {
    const s = aSeleccion(
      estado({
        marcados: { movilidad: true, 'amortizacion-domiciliario': true },
        entradas: { movilidad: { km: '50', consumo: '' }, 'amortizacion-domiciliario': { precio: '2.400.000,00' } },
      }),
      datos,
    );
    expect(s.items.movilidad).toEqual({ km: 50 });
    expect(s.items['amortizacion-domiciliario']).toEqual({ precio: 2400000 });
  });

  it('no manda datos de ítems que no están marcados', () => {
    const s = aSeleccion(estado({ entradas: { movilidad: { km: '50' } } }), datos);
    expect(s.items.movilidad).toBeUndefined();
  });

  it('el resultado se puede calcular de punta a punta', () => {
    const calculo = calcular(aSeleccion(estado({ marcados: { multifuncion: true } }), datos), datos);
    expect(calculo.ok).toBe(true);
    if (calculo.ok) expect(calculo.resultado.total).toBe(46811 + 18724);
  });
});

describe('resumenDelItem', () => {
  it('describe cada tipo de ítem con su valor para el rol', () => {
    const cm = estado();
    const foto = estado({ rolId: 'fotoperiodista' });
    const redactor = estado({ rolId: 'redactor-digital' });
    expect(resumenDelItem(item('multifuncion'), cm, datos)).toBe('40 % del valor hora');
    expect(resumenDelItem(item('cobertura-de-emergencia'), foto, datos)).toBe('30 % del valor hora');
    expect(resumenDelItem(item('conectividad'), cm, datos)).toMatch(/32\.000 por mes$/);
    expect(resumenDelItem(item('ia-y-redes'), redactor, datos)).toMatch(/15\.125 por mes$/);
    expect(resumenDelItem(item('antiguedad'), cm, datos)).toMatch(/por mes por año$/);
    expect(resumenDelItem(item('refrigerio'), cm, datos)).toMatch(/por jornada de 6 h$/);
  });

  it('los calculados reflejan la categoría, la provincia y la antigüedad elegidas', () => {
    expect(resumenDelItem(item('monotributo'), estado({ categoria: 'B' }), datos)).toMatch(/56\.379 por mes en la categoría B$/);
    const chaco = datos.provincias.find((p) => p.id === 'chaco')!.ingresosBrutos;
    const fijoA = chaco.modo === 'fijo-por-categoria' ? chaco.montos.A : 0;
    expect(resumenDelItem(item('ingresos-brutos'), estado(), datos)).toBe(
      `Chaco: ${formatearPesos(fijoA)} por mes en la categoría A`,
    );
    expect(resumenDelItem(item('ingresos-brutos'), estado({ provinciaId: 'corrientes' }), datos)).toBe(
      'Corrientes: 3 % sobre el total facturado',
    );
    expect(resumenDelItem(item('fondo-vacaciones'), estado({ antiguedad: '12' }), datos)).toMatch(/^28 días/);
  });

  it('el valor hora del rol es el base mensual sobre las horas de referencia', () => {
    expect(valorHoraDelRol('productor', datos)).toBeCloseTo(6727.52, 2);
  });

  it('el consumo de la movilidad arranca en el del parámetro', () => {
    expect(estadoInicial(datos).entradas.movilidad?.consumo).toBe('8');
  });
});

describe('fechas', () => {
  it('formatea vigencias y fechas en castellano', () => {
    expect(formatearVigencia('2026-10')).toBe('octubre de 2026');
    expect(formatearFecha('2026-08-01')).toBe('1 de agosto de 2026');
  });

  it('la vigencia de los datos es la más reciente de todas', () => {
    const v = vigenciaDeLosDatos(datos);
    expect(v).toMatch(/^\d{4}-\d{2}$/);
    expect(datos.roles.every((r) => r.vigencia <= v)).toBe(true);
  });
});
