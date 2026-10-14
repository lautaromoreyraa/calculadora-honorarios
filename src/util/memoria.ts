// Lo que la calculadora recuerda entre visitas (RF-26): los datos que no cambian
// de un trabajo a otro. Queda en el almacenamiento del navegador y nunca viaja a
// un servidor (RNF-02). Si el navegador no deja guardar —ventana privada, datos
// bloqueados—, todo sigue funcionando sin recordar nada.
import type { Datos } from './datos/tipos.ts';
import { camposDeItem, estadoInicial, type Campo, type EstadoDelFormulario, type Vehiculo } from './formulario.ts';

export const CLAVE = 'calculadora-honorarios:perfil';
/** Si cambia la forma del perfil, se sube y lo guardado antes se descarta. */
const VERSION = 1;

/**
 * De cada ítem se recuerdan los datos que son del profesional, no del trabajo:
 * el precio de su equipo y el consumo de su auto. El monto de un alquiler y los
 * kilómetros cambian con cada trabajo.
 */
const CAMPOS_QUE_SE_RECUERDAN: Campo[] = ['precio', 'consumo'];

export interface Perfil {
  version: number;
  rolId: string;
  provinciaId: string;
  categoria: string;
  antiguedad: string;
  marcados: Record<string, boolean>;
  entradas: Record<string, Partial<Record<Campo, string>>>;
  profesional: string;
  /** Opcional: los perfiles guardados antes de RF-13 no lo tienen. */
  vehiculo?: Vehiculo;
}

/** La parte del estado que se recuerda. Horas, tipo de cliente y plazo quedan afuera. */
export function perfilDe(estado: EstadoDelFormulario): Perfil {
  const entradas: Perfil['entradas'] = {};
  for (const [itemId, valores] of Object.entries(estado.entradas)) {
    const propios = Object.fromEntries(
      CAMPOS_QUE_SE_RECUERDAN.filter((c) => valores[c]?.trim()).map((c) => [c, valores[c]]),
    );
    if (Object.keys(propios).length > 0) entradas[itemId] = propios;
  }
  return {
    version: VERSION,
    rolId: estado.rolId,
    provinciaId: estado.provinciaId,
    categoria: estado.categoria,
    antiguedad: estado.antiguedad,
    marcados: Object.fromEntries(Object.entries(estado.marcados).filter(([, m]) => m)),
    entradas,
    profesional: estado.profesional,
    vehiculo: estado.vehiculo,
  };
}

const esTexto = (v: unknown): v is string => typeof v === 'string';

/**
 * El estado inicial con lo recordado encima. Lo guardado puede venir de una
 * versión vieja de los datos: un rol, una categoría o un ítem que ya no existe
 * se descarta en vez de romper la página.
 */
export function restaurar(guardado: unknown, datos: Datos): EstadoDelFormulario {
  const inicial = estadoInicial(datos);
  if (typeof guardado !== 'object' || guardado === null) return inicial;
  const p = guardado as Partial<Perfil>;
  if (p.version !== VERSION) return inicial;

  const items = new Map(datos.items.filter((i) => !i.exclusion).map((i) => [i.id, i]));
  const marcados = Object.fromEntries(
    Object.entries(p.marcados ?? {}).filter(([id, m]) => m === true && items.has(id)),
  );
  const entradas = { ...inicial.entradas };
  for (const [id, valores] of Object.entries(p.entradas ?? {})) {
    const item = items.get(id);
    if (!item || typeof valores !== 'object' || valores === null) continue;
    for (const campo of camposDeItem(item).filter((c) => CAMPOS_QUE_SE_RECUERDAN.includes(c))) {
      const valor = (valores as Record<string, unknown>)[campo];
      if (esTexto(valor)) entradas[id] = { ...entradas[id], [campo]: valor };
    }
  }

  return {
    ...inicial,
    rolId: datos.roles.some((r) => r.id === p.rolId) ? p.rolId! : inicial.rolId,
    provinciaId: datos.provincias.some((x) => x.id === p.provinciaId) ? p.provinciaId! : inicial.provinciaId,
    categoria: datos.monotributo.categorias.some((c) => c.letra === p.categoria) ? p.categoria! : inicial.categoria,
    antiguedad: esTexto(p.antiguedad) ? p.antiguedad : inicial.antiguedad,
    marcados,
    entradas,
    profesional: esTexto(p.profesional) ? p.profesional : '',
    vehiculo: p.vehiculo === 'moto' ? 'moto' : 'auto',
  };
}

/** Lo guardado, o null si no hay nada o el navegador no deja leer. */
export function leerPerfil(almacen: Pick<Storage, 'getItem'> | undefined): unknown {
  try {
    const texto = almacen?.getItem(CLAVE);
    return texto ? JSON.parse(texto) : null;
  } catch {
    return null;
  }
}

export function guardarPerfil(almacen: Pick<Storage, 'setItem'> | undefined, perfil: Perfil): void {
  try {
    almacen?.setItem(CLAVE, JSON.stringify(perfil));
  } catch {
    // Sin permiso o sin espacio: la calculadora sigue, sólo que no recuerda.
  }
}

export function olvidarPerfil(almacen: Pick<Storage, 'removeItem'> | undefined): void {
  try {
    almacen?.removeItem(CLAVE);
  } catch {
    // Idem: no hay nada que hacer si el navegador no deja tocar el almacenamiento.
  }
}

/** Si se puede escribir de verdad: en algunas ventanas privadas el objeto existe pero no guarda. */
export function puedeRecordar(almacen: Pick<Storage, 'setItem' | 'removeItem'> | undefined): boolean {
  try {
    if (!almacen) return false;
    almacen.setItem(`${CLAVE}:prueba`, '1');
    almacen.removeItem(`${CLAVE}:prueba`);
    return true;
  } catch {
    return false;
  }
}

/** localStorage, o undefined si el navegador ni siquiera deja acceder a él. */
export function almacenDelNavegador(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}
