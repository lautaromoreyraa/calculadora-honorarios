import roles from '../../../datos/roles.json';
import items from '../../../datos/items.json';
import monotributo from '../../../datos/monotributo.json';
import provincias from '../../../datos/provincias.json';
import combustible from '../../../datos/combustible.json';
import parametros from '../../../datos/parametros.json';
import type { Datos } from './tipos.ts';

// TypeScript infiere de un JSON tipos anchos (`tipo: string`, no la unión de
// literales), así que la conversión va por `unknown`. Es seguro porque cada
// archivo ya pasó por su esquema en la verificación del PR (validar-datos).
export const datos: Datos = {
  roles: roles.roles,
  grupos: items.grupos,
  exclusiones: items.exclusiones,
  items: items.items as unknown as Datos['items'],
  monotributo,
  provincias: provincias.provincias as unknown as Datos['provincias'],
  combustible,
  parametros,
};

export type * from './tipos.ts';
