import type { Datos } from './datos/tipos.ts';
import { camposDeItem, estadoInicial, type Campo, type EstadoDelFormulario, type Vehiculo } from './formulario.ts';
import type { Moneda } from './moneda.ts';

export const CLAVE = 'calculadora-honorarios:perfil';
const VERSION = 1;

const CAMPOS_QUE_SE_RECUERDAN: Campo[] = ['precio', 'consumo'];

export interface Perfil {
  version: number;
  rolId: string;
  categoria: string;
  antiguedad: string;
  marcados: Record<string, boolean>;
  entradas: Record<string, Partial<Record<Campo, string>>>;
  profesional: string;
  email?: string;
  telefono?: string;
  cuit?: string;
  condiciones?: string;
  vehiculo?: Vehiculo;
  moneda?: Moneda;
}

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
    categoria: estado.categoria,
    antiguedad: estado.antiguedad,
    marcados: Object.fromEntries(Object.entries(estado.marcados).filter(([, m]) => m)),
    entradas,
    profesional: estado.profesional,
    email: estado.email,
    telefono: estado.telefono,
    cuit: estado.cuit,
    condiciones: estado.condiciones,
    vehiculo: estado.vehiculo,
    moneda: estado.moneda,
  };
}

const esTexto = (v: unknown): v is string => typeof v === 'string';

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
    categoria: datos.monotributo.categorias.some((c) => c.letra === p.categoria) ? p.categoria! : inicial.categoria,
    antiguedad: esTexto(p.antiguedad) ? p.antiguedad : inicial.antiguedad,
    marcados,
    entradas,
    profesional: esTexto(p.profesional) ? p.profesional : '',
    email: esTexto(p.email) ? p.email : '',
    telefono: esTexto(p.telefono) ? p.telefono : '',
    cuit: esTexto(p.cuit) ? p.cuit : '',
    condiciones: esTexto(p.condiciones) ? p.condiciones : inicial.condiciones,
    vehiculo: p.vehiculo === 'moto' || p.vehiculo === 'privado' ? p.vehiculo : 'auto',
    moneda: p.moneda === 'USD' ? 'USD' : 'ARS',
  };
}

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
  }
}

export function olvidarPerfil(almacen: Pick<Storage, 'removeItem'> | undefined): void {
  try {
    almacen?.removeItem(CLAVE);
  } catch {
  }
}

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

export function almacenDelNavegador(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

const CLAVE_DEL_NUMERO = 'calculadora-honorarios:ultimo-presupuesto';

export function leerUltimoNumero(almacen: Pick<Storage, 'getItem'> | undefined): string | null {
  try {
    return almacen?.getItem(CLAVE_DEL_NUMERO) ?? null;
  } catch {
    return null;
  }
}

export function guardarUltimoNumero(almacen: Pick<Storage, 'setItem'> | undefined, numero: string): void {
  try {
    if (numero.trim()) almacen?.setItem(CLAVE_DEL_NUMERO, numero.trim());
  } catch {
  }
}
