import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { conCotizacion } from '../../util/cotizaciones.ts';
import { FUENTE_DEL_OFICIAL, leerRespuestaDelBcra } from '../../util/dolar-oficial.ts';

// RF-21: la Action diaria trae la cotización de referencia del BCRA y la deja
// en dolarOficial, sin tocar nada más de parametros.json.

const respuesta = (fecha: unknown, detalle: unknown) => ({ status: 200, results: [{ fecha, detalle }] });
const usd = (tipoCotizacion: unknown) => [{ codigoMoneda: 'USD', descripcion: 'DOLAR E.E.U.U.', tipoPase: 0, tipoCotizacion }];

describe('RF-21 · dólar oficial del BCRA', () => {
  it('lee la cotización del último día hábil publicado', () => {
    expect(leerRespuestaDelBcra(respuesta('2026-11-04', usd(1546)))).toEqual({
      valor: 1546,
      fecha: '2026-11-04',
      fuente: FUENTE_DEL_OFICIAL,
    });
  });

  it('con una respuesta rota no devuelve nada que se pueda publicar', () => {
    expect(() => leerRespuestaDelBcra({ status: 500 })).toThrow(/fecha/);
    expect(() => leerRespuestaDelBcra(null)).toThrow();
    expect(() => leerRespuestaDelBcra(respuesta('04/11/2026', usd(1546)))).toThrow(/fecha/);
    expect(() => leerRespuestaDelBcra(respuesta('2026-11-04', usd(0)))).toThrow(/cotización/);
    expect(() => leerRespuestaDelBcra(respuesta('2026-11-04', usd('1546')))).toThrow(/cotización/);
    expect(() => leerRespuestaDelBcra(respuesta('2026-11-04', [{ codigoMoneda: 'EUR', tipoCotizacion: 1700 }]))).toThrow();
  });

  it('cambia sólo el bloque dolarOficial de parametros.json', () => {
    const texto = readFileSync(new URL('../../../datos/parametros.json', import.meta.url), 'utf8');
    const actual = JSON.parse(texto).dolarOficial;
    const cotizacion = { valor: actual.valor + 10, fecha: actual.fecha === '2000-01-01' ? '2000-01-02' : '2000-01-01', fuente: FUENTE_DEL_OFICIAL };
    const nuevo = conCotizacion(texto, 'dolarOficial', cotizacion);
    expect(JSON.parse(nuevo).dolarOficial).toEqual(cotizacion);
    expect(JSON.parse(nuevo).dolarBlue).toEqual(JSON.parse(texto).dolarBlue);
    const distintas = nuevo.split('\n').filter((linea, i) => linea !== texto.split('\n')[i]);
    expect(distintas).toHaveLength(2);
  });
});
