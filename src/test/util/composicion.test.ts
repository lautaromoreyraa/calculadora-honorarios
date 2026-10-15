import { describe, expect, it } from 'vitest';
import { calcular, type Resultado, type Seleccion } from '../../util/calculo/index.ts';
import { composicionDelTotal } from '../../util/composicion.ts';
import { datos } from '../../util/datos/index.ts';
import { enDolares } from '../../util/moneda.ts';

// RNF-13: la barra del resultado reparte el total en cuatro partes.

const seleccion = (cambios: Partial<Seleccion> = {}): Seleccion => ({
  rolId: 'cm',
  provinciaId: 'chaco',
  categoria: 'A',
  horas: 10,
  antiguedad: 3,
  items: { 'cliente-d': {}, nocturnidad: {}, monotributo: {}, 'fondo-sac': {}, conectividad: {}, antiguedad: {} },
  ...cambios,
});

function resultado(s: Seleccion, conDolares = false): Resultado {
  const c = calcular(
    s,
    datos,
    conDolares ? enDolares({ valor: 1550, fecha: '2026-10-14', fuente: 'prueba' }) : undefined,
  );
  if (!c.ok) throw new Error('no calculó');
  return c.resultado;
}

const suma = (r: Resultado) =>
  Math.round(composicionDelTotal(r, datos).reduce((s, p) => s + p.monto, 0) * 100) / 100;

describe('RNF-13 · composición del total', () => {
  it('las partes suman el total, también en Corrientes y en dólares', () => {
    for (const r of [
      resultado(seleccion()),
      resultado(seleccion({ provinciaId: 'corrientes', items: { 'cliente-a': {}, 'ingresos-brutos': {} } })),
      resultado(seleccion(), true),
    ]) {
      expect(suma(r)).toBe(r.total);
    }
  });

  it('reparte por grupo: base, adicionales, impuestos y costos, en ese orden', () => {
    const r = resultado(seleccion());
    const partes = composicionDelTotal(r, datos);
    expect(partes.map((p) => p.parte)).toEqual(['base', 'adicionales', 'impuestos', 'costos']);
    const base = r.renglones.find((x) => x.id === 'honorario-base')!.monto;
    expect(partes[0].monto).toBe(base);
    const impuestos = ['monotributo', 'fondo-sac'].reduce((s, id) => s + r.renglones.find((x) => x.id === id)!.monto, 0);
    expect(partes[2].monto).toBe(impuestos);
  });

  it('el ingreso bruto sobre el total de Corrientes cuenta como impuesto', () => {
    const r = resultado(seleccion({ provinciaId: 'corrientes', items: { 'cliente-a': {}, 'ingresos-brutos': {} } }));
    const impuestos = composicionDelTotal(r, datos).find((p) => p.parte === 'impuestos');
    expect(impuestos?.monto).toBe(r.ingresosBrutosSobreTotal!.monto);
  });

  it('una parte sin monto no aparece', () => {
    const r = resultado(seleccion({ items: { 'cliente-a': {} } }));
    expect(composicionDelTotal(r, datos).map((p) => p.parte)).toEqual(['base']);
  });
});
