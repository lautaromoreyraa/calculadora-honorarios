import { describe, expect, it } from 'vitest';
import { datos } from '../../util/datos/index.ts';
import { estadoInicial, type EstadoDelFormulario } from '../../util/formulario.ts';
import { CLAVE, guardarPerfil, leerPerfil, olvidarPerfil, perfilDe, puedeRecordar, restaurar } from '../../util/memoria.ts';

// RF-26: recordar los datos del profesional entre visitas, sin los del trabajo.

/** Un localStorage en memoria, como el del navegador. */
function almacen(): Storage {
  const valores = new Map<string, string>();
  return {
    get length() {
      return valores.size;
    },
    clear: () => valores.clear(),
    getItem: (k) => valores.get(k) ?? null,
    key: (i) => [...valores.keys()][i] ?? null,
    removeItem: (k) => void valores.delete(k),
    setItem: (k, v) => void valores.set(k, v),
  };
}

const lleno = (): EstadoDelFormulario => ({
  ...estadoInicial(datos),
  rolId: datos.roles[2].id,
  provinciaId: 'corrientes',
  categoria: 'B',
  horas: '12',
  antiguedad: '6',
  marcados: { conectividad: true, 'amortizacion-domiciliario': true, movilidad: true, licencias: false },
  elegidos: { plazo: 'plazo-urgente', 'tipo-de-cliente': 'cliente-d' },
  entradas: {
    'amortizacion-domiciliario': { precio: '1.200.000' },
    movilidad: { km: '40', consumo: '7,5' },
    'alquiler-kit-liviano': { monto: '50.000' },
  },
  profesional: 'Ana Gómez',
});

/** Guardar y volver a abrir la página. */
function recargar(estado: EstadoDelFormulario, a = almacen()): EstadoDelFormulario {
  guardarPerfil(a, perfilDe(estado));
  return restaurar(leerPerfil(a), datos);
}

describe('RF-26 · recordar los datos del profesional', () => {
  it('marcar conectividad y recargar la deja marcada; las horas vuelven vacías', () => {
    const e = recargar({ ...estadoInicial(datos), horas: '9', marcados: { conectividad: true } });
    expect(e.marcados.conectividad).toBe(true);
    expect(e.horas).toBe('');
  });

  it('recuerda rol, provincia, categoría, antigüedad, nombre y los datos del equipo', () => {
    const e = recargar(lleno());
    expect(e.rolId).toBe(datos.roles[2].id);
    expect(e.provinciaId).toBe('corrientes');
    expect(e.categoria).toBe('B');
    expect(e.antiguedad).toBe('6');
    expect(e.profesional).toBe('Ana Gómez');
    expect(e.entradas['amortizacion-domiciliario']).toEqual({ precio: '1.200.000' });
    expect(e.entradas.movilidad?.consumo).toBe('7,5');
  });

  it('no recuerda lo propio del trabajo: tipo de cliente, plazo, kilómetros ni montos', () => {
    const e = recargar(lleno());
    expect(Object.values(e.elegidos).every((v) => v === null)).toBe(true);
    expect(e.entradas.movilidad?.km).toBeUndefined();
    expect(e.entradas['alquiler-kit-liviano']).toBeUndefined();
  });

  it('olvidar deja todo como en la primera visita', () => {
    const a = almacen();
    guardarPerfil(a, perfilDe(lleno()));
    olvidarPerfil(a);
    expect(a.getItem(CLAVE)).toBeNull();
    expect(restaurar(leerPerfil(a), datos)).toEqual(estadoInicial(datos));
  });

  it('con el almacenamiento bloqueado, no rompe: arranca de cero', () => {
    const bloqueado = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('SecurityError');
      },
    };
    expect(() => guardarPerfil(bloqueado, perfilDe(lleno()))).not.toThrow();
    expect(puedeRecordar({ ...bloqueado, removeItem: () => undefined })).toBe(false);
    expect(puedeRecordar(undefined)).toBe(false);
    expect(puedeRecordar(almacen())).toBe(true);
    expect(restaurar(leerPerfil(bloqueado), datos)).toEqual(estadoInicial(datos));
    expect(restaurar(leerPerfil(undefined), datos)).toEqual(estadoInicial(datos));
  });

  it('descarta lo guardado que ya no existe en los datos, o que vino roto', () => {
    const a = almacen();
    a.setItem(CLAVE, JSON.stringify({ ...perfilDe(lleno()), rolId: 'ya-no-existe', marcados: { fantasma: true } }));
    const e = restaurar(leerPerfil(a), datos);
    expect(e.rolId).toBe(estadoInicial(datos).rolId);
    expect(e.marcados).toEqual({});

    a.setItem(CLAVE, '{no es json');
    expect(restaurar(leerPerfil(a), datos)).toEqual(estadoInicial(datos));

    a.setItem(CLAVE, JSON.stringify({ ...perfilDe(lleno()), version: 99 }));
    expect(restaurar(leerPerfil(a), datos)).toEqual(estadoInicial(datos));
  });
});
