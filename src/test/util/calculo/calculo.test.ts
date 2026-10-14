import { describe, expect, it } from 'vitest';
import { datos } from '../../../util/datos/index.ts';
import type { Datos } from '../../../util/datos/tipos.ts';
import { calcular, type EntradaDeItem, type Resultado, type Seleccion } from '../../../util/calculo/index.ts';

// Un test por criterio de aceptación del SRS (RNF-05). Los números esperados
// salen del SRS, no de correr el código.

const seleccion = (cambios: Partial<Seleccion> = {}, items: Record<string, EntradaDeItem> = {}): Seleccion => ({
  rolId: 'cm',
  provinciaId: 'chaco',
  categoria: 'A',
  horas: 10,
  antiguedad: 0,
  ...cambios,
  items: { 'cliente-a': {}, ...items },
});

function resultado(s: Seleccion, d: Datos = datos): Resultado {
  const calculo = calcular(s, d);
  if (!calculo.ok) throw new Error(calculo.errores.map((e) => e.mensaje).join(' '));
  return calculo.resultado;
}

const monto = (r: Resultado, id: string) => r.renglones.find((x) => x.id === id)?.monto;

describe('RF-01 · elegir el rol', () => {
  it('productor: valor hora de $6.727,52 y su convenio', () => {
    const r = resultado(seleccion({ rolId: 'productor' }));
    expect(r.valorHora).toBeCloseTo(6727.52, 2);
    expect(r.rol.convenio).toContain('CCT 131/75');
    expect(r.rol.convenio).toContain('SATSAID');
  });
});

describe('RF-02 · cotizar por horas', () => {
  it('CM con 10 horas: honorario base de $46.811', () => {
    expect(monto(resultado(seleccion()), 'honorario-base')).toBe(46811);
  });

  it('acepta horas con decimales', () => {
    expect(monto(resultado(seleccion({ horas: 1.5 })), 'honorario-base')).toBe(7022);
  });

  it.each([0, -3, Number.NaN])('con %s horas no calcula y avisa', (horas) => {
    const calculo = calcular(seleccion({ horas }), datos);
    expect(calculo.ok).toBe(false);
    if (!calculo.ok) expect(calculo.errores).toContainEqual(expect.objectContaining({ campo: 'horas' }));
  });

  it('sin horas cargadas pide cargarlas, sin retar', () => {
    const calculo = calcular(seleccion({ horas: Number.NaN }), datos);
    expect(calculo.ok).toBe(false);
    if (!calculo.ok) expect(calculo.errores).toContainEqual({ campo: 'horas', mensaje: 'Cargá las horas del trabajo.' });
  });
});

describe('RF-03 · adicionales porcentuales', () => {
  it('CM, 10 horas, multifunción y nocturnidad: se suman al base sin componerse', () => {
    const r = resultado(seleccion({}, { multifuncion: {}, nocturnidad: {} }));
    expect(monto(r, 'multifuncion')).toBe(18724);
    expect(monto(r, 'nocturnidad')).toBe(11703);
    expect(r.total).toBe(46811 + 18724 + 11703);
  });

  it('feriado: 100 % del valor hora', () => {
    expect(monto(resultado(seleccion({}, { feriado: {} })), 'feriado')).toBe(46811);
  });

  it('cobertura de emergencia: 30 % para fotoperiodista y 15 % para el resto (RN-04)', () => {
    const foto = resultado(seleccion({ rolId: 'fotoperiodista' }, { 'cobertura-de-emergencia': {} }));
    const cm = resultado(seleccion({}, { 'cobertura-de-emergencia': {} }));
    expect(monto(foto, 'cobertura-de-emergencia')).toBe(14043);
    expect(monto(cm, 'cobertura-de-emergencia')).toBe(7022);
  });
});

describe('RF-04 · tipo de cliente', () => {
  it('D suma el 40 % del honorario base y A no suma nada', () => {
    const d = resultado({ ...seleccion(), items: { 'cliente-d': {} } });
    expect(monto(d, 'cliente-d')).toBe(18724);
    expect(monto(resultado(seleccion()), 'cliente-a')).toBe(0);
  });

  it('el renglón lleva el nombre del conjunto obligatorio adelante', () => {
    const d = resultado({ ...seleccion(), items: { 'cliente-d': {} } });
    expect(d.renglones.find((x) => x.id === 'cliente-d')?.concepto).toBe('Tipo de cliente: D · Empresas privadas');
    const urgente = resultado(seleccion({}, { urgente: {} }));
    expect(urgente.renglones.find((x) => x.id === 'urgente')?.concepto).toBe('Entrega urgente (24 a 48 h)');
  });

  it('no calcula sin tipo de cliente', () => {
    const calculo = calcular({ ...seleccion(), items: {} }, datos);
    expect(calculo.ok).toBe(false);
  });

  it('no acepta dos tipos de cliente', () => {
    expect(calcular(seleccion({}, { 'cliente-b': {} }), datos).ok).toBe(false);
  });
});

describe('RF-05 · plazo de entrega', () => {
  it('urgente y muy urgente no van juntos', () => {
    const calculo = calcular(seleccion({}, { urgente: {}, 'muy-urgente': {} }), datos);
    expect(calculo.ok).toBe(false);
  });

  it('muy urgente suma el 75 % del honorario base', () => {
    expect(monto(resultado(seleccion({}, { 'muy-urgente': {} })), 'muy-urgente')).toBe(35108);
  });
});

describe('RF-06 · costos operativos mensuales', () => {
  it('conectividad de $32.000 en 9 horas suma $1.600', () => {
    expect(monto(resultado(seleccion({ horas: 9 }, { conectividad: {} })), 'conectividad')).toBe(1600);
  });

  it('licencias e IA salen del precio en dólares (RN-15)', () => {
    const r = resultado(seleccion({ horas: 180 }, { licencias: {}, 'ia-y-redes': {} }));
    expect(monto(r, 'licencias')).toBe(52930);
    expect(monto(r, 'ia-y-redes')).toBe(30242);
    const redactor = resultado(seleccion({ rolId: 'redactor-digital', horas: 180 }, { 'ia-y-redes': {} }));
    expect(monto(redactor, 'ia-y-redes')).toBe(15125);
  });
});

describe('RF-07 · monotributo por categoría', () => {
  it('categoría B, 18 horas: $5.638', () => {
    expect(monto(resultado(seleccion({ categoria: 'B', horas: 18 }, { monotributo: {} })), 'monotributo')).toBe(5638);
  });

  it('una categoría agregada a los datos se puede usar sin cambiar código (RF-18)', () => {
    const conC: Datos = structuredClone(datos);
    conC.monotributo.categorias.push({
      letra: 'C',
      topeAnual: 1,
      impuestoIntegrado: 1800,
      sipa: 0,
      obraSocial: 0,
      vigencia: '2026-08',
    });
    expect(monto(resultado(seleccion({ categoria: 'C', horas: 180 }, { monotributo: {} }), conC), 'monotributo')).toBe(1800);
  });
});

describe('RF-08 · ingresos brutos según la provincia', () => {
  it('Chaco, categoría A, 18 horas: renglón de $1.042', () => {
    expect(monto(resultado(seleccion({ horas: 18 }, { 'ingresos-brutos': {} })), 'ingresos-brutos')).toBe(1042);
  });

  it('Corrientes con 3 % y subtotal de $100.000: total de $103.093', () => {
    const cienMil: Datos = structuredClone(datos);
    cienMil.roles[0].valorBaseMensual = 100000;
    const r = resultado(seleccion({ provinciaId: 'corrientes', horas: 180 }, { 'ingresos-brutos': {} }), cienMil);
    expect(r.subtotal).toBe(100000);
    expect(r.ingresosBrutosSobreTotal?.monto).toBe(3093);
    expect(r.total).toBe(103093);
  });

  it('sin marcar ingresos brutos, Corrientes no suma nada', () => {
    const r = resultado(seleccion({ provinciaId: 'corrientes' }));
    expect(r.ingresosBrutosSobreTotal).toBeUndefined();
    expect(r.total).toBe(r.subtotal);
  });
});

describe('RF-09 · fondos de vacaciones y aguinaldo', () => {
  it('CM, 3 años, 180 horas: SAC $70.217 y vacaciones $39.321', () => {
    const r = resultado(seleccion({ horas: 180, antiguedad: 3 }, { 'fondo-sac': {}, 'fondo-vacaciones': {} }));
    expect(monto(r, 'fondo-sac')).toBe(70217);
    expect(monto(r, 'fondo-vacaciones')).toBe(39321);
  });

  it('con 5 años de antigüedad pasan a ser 21 días de vacaciones', () => {
    const r = resultado(seleccion({ horas: 180, antiguedad: 5 }, { 'fondo-vacaciones': {} }));
    expect(monto(r, 'fondo-vacaciones')).toBe(Math.round((842598 / 25) * 21 / 12));
  });
});

describe('RF-10 · título y antigüedad', () => {
  it('5 años de antigüedad, 180 horas: $33.990', () => {
    expect(monto(resultado(seleccion({ horas: 180, antiguedad: 5 }, { antiguedad: {} })), 'antiguedad')).toBe(33990);
  });

  it('marcada con 0 años suma cero y avisa dónde cargar la antigüedad', () => {
    const r = resultado(seleccion({ horas: 180, antiguedad: 0 }, { antiguedad: {} }));
    expect(monto(r, 'antiguedad')).toBe(0);
    expect(r.avisos.join()).toMatch(/años de antigüedad/);
    expect(r.renglones.find((x) => x.id === 'antiguedad')?.falta).toBe(true);
  });

  it('el productor usa su propio valor de antigüedad', () => {
    const r = resultado(seleccion({ rolId: 'productor', horas: 180, antiguedad: 1 }, { antiguedad: {} }));
    expect(monto(r, 'antiguedad')).toBe(10782);
  });

  it('título: $43.120 por mes prorrateado', () => {
    expect(monto(resultado(seleccion({ horas: 90 }, { titulo: {} })), 'titulo')).toBe(21560);
  });
});

describe('RF-11 · amortización de equipos', () => {
  it('equipo de $2.400.000, 24 meses, 18 horas: $10.000', () => {
    const r = resultado(seleccion({ horas: 18 }, { 'amortizacion-domiciliario': { precio: 2400000 } }));
    expect(monto(r, 'amortizacion-domiciliario')).toBe(10000);
  });

  it('sin precio suma cero y avisa', () => {
    const r = resultado(seleccion({}, { 'amortizacion-kit-liviano': {} }));
    expect(monto(r, 'amortizacion-kit-liviano')).toBe(0);
    expect(r.avisos.join()).toMatch(/precio/);
  });
});

describe('RF-12 · alquiler de equipamiento', () => {
  it.each([1, 40])('un alquiler de $25.000 suma $25.000 con %s horas', (horas) => {
    const r = resultado(seleccion({ horas }, { 'alquiler-kit-profesional': { monto: 25000 } }));
    expect(monto(r, 'alquiler-kit-profesional')).toBe(25000);
  });
});

describe('RF-13 · movilidad por kilómetros', () => {
  it('50 km a 10 l/100 km con nafta a $2.100: $10.500', () => {
    const nafta: Datos = structuredClone(datos);
    nafta.combustible.precios.chaco.precio = 2100;
    const r = resultado(seleccion({}, { movilidad: { km: 50, consumo: 10 } }), nafta);
    expect(monto(r, 'movilidad')).toBe(10500);
  });

  it('sin consumo usa el del auto por defecto, 8 l/100 km', () => {
    const r = resultado(seleccion({}, { movilidad: { km: 100 } }));
    expect(monto(r, 'movilidad')).toBe(8 * datos.combustible.precios.chaco.precio);
  });

  it('sin kilómetros suma cero y avisa', () => {
    const r = resultado(seleccion({}, { movilidad: {} }));
    expect(monto(r, 'movilidad')).toBe(0);
    expect(r.avisos.join()).toMatch(/kilómetros/);
  });
});

describe('RF-14 · refrigerio y exteriores por jornada', () => {
  it('8 horas son 2 jornadas: refrigerio $15.986 y exteriores $19.910', () => {
    const r = resultado(seleccion({ horas: 8 }, { refrigerio: {}, exteriores: {} }));
    expect(monto(r, 'refrigerio')).toBe(15986);
    expect(monto(r, 'exteriores')).toBe(19910);
  });

  it('6 horas son 1 jornada', () => {
    expect(monto(resultado(seleccion({ horas: 6 }, { refrigerio: {} })), 'refrigerio')).toBe(7993);
  });
});

describe('RF-15 · desglose y total', () => {
  it('el total es la suma de los renglones mostrados (RN-11)', () => {
    const items = Object.fromEntries(
      datos.items.filter((i) => !i.exclusion).map((i) => [i.id, { precio: 1000000, monto: 5000, km: 30 }]),
    );
    const r = resultado(seleccion({ provinciaId: 'corrientes', horas: 13.5, antiguedad: 7 }, items));
    const suma = r.renglones.reduce((t, x) => t + x.monto, 0) + (r.ingresosBrutosSobreTotal?.monto ?? 0);
    expect(r.total).toBe(suma);
    expect(r.renglones.every((x) => Number.isInteger(x.monto))).toBe(true);
  });

  it('el honorario base va primero y cada renglón explica cómo se calculó', () => {
    const r = resultado(seleccion({}, { conectividad: {} }));
    expect(r.renglones[0].id).toBe('honorario-base');
    expect(r.renglones.every((x) => x.detalle.length > 0)).toBe(true);
  });
});
