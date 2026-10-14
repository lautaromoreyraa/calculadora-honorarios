import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { conDolarBlue, FUENTE_DEL_BLUE, hayQueActualizar, leerRespuesta } from '../../util/dolar-blue.ts';

// RF-29: la Action diaria actualiza el dólar blue sólo con un valor nuevo y razonable.

const anterior = { valor: 1550, fecha: '2026-10-14', fuente: FUENTE_DEL_BLUE };

describe('RF-29 · dólar blue diario', () => {
  it('lee la venta y el día en Argentina, aunque en UTC ya sea mañana', () => {
    expect(leerRespuesta({ compra: 1530, venta: 1560, fechaActualizacion: '2026-10-16T01:30:00.000Z' })).toEqual({
      valor: 1560,
      fecha: '2026-10-15',
      fuente: FUENTE_DEL_BLUE,
    });
  });

  it('rechaza una respuesta sin precio de venta', () => {
    expect(() => leerRespuesta({ compra: 1530 })).toThrow(/venta/);
    expect(() => leerRespuesta(null)).toThrow();
    expect(() => leerRespuesta({ venta: 0, fechaActualizacion: '2026-10-15T15:00:00Z' })).toThrow();
  });

  it('actualiza si cambia el valor o el día, no si es lo mismo', () => {
    expect(hayQueActualizar(anterior, { ...anterior, valor: 1565 })).toBe(true);
    expect(hayQueActualizar(anterior, { ...anterior, fecha: '2026-10-15' })).toBe(true);
    expect(hayQueActualizar(anterior, anterior)).toBe(false);
  });

  it('no vuelve atrás a una cotización más vieja', () => {
    expect(hayQueActualizar(anterior, { ...anterior, valor: 1500, fecha: '2026-10-13' })).toBe(false);
  });

  it('frena un valor absurdo en vez de publicarlo', () => {
    expect(() => hayQueActualizar(anterior, { ...anterior, valor: 700 })).toThrow(/fuera de rango/);
    expect(() => hayQueActualizar(anterior, { ...anterior, valor: 3200 })).toThrow(/fuera de rango/);
  });

  it('cambia sólo el bloque dolarBlue de parametros.json, sin reformatear el resto', () => {
    const texto = readFileSync(new URL('../../../datos/parametros.json', import.meta.url), 'utf8');
    const nuevo = conDolarBlue(texto, { valor: 1575, fecha: '2026-10-15', fuente: FUENTE_DEL_BLUE });
    expect(JSON.parse(nuevo).dolarBlue).toEqual({ valor: 1575, fecha: '2026-10-15', fuente: FUENTE_DEL_BLUE });
    const distintas = nuevo.split('\n').filter((linea, i) => linea !== texto.split('\n')[i]);
    expect(distintas).toHaveLength(2);
    expect(JSON.parse(nuevo).dolarOficial).toEqual(JSON.parse(texto).dolarOficial);
  });
});
