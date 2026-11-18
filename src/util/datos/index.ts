import roles from '../../../datos/roles.json';
import items from '../../../datos/items.json';
import monotributo from '../../../datos/monotributo.json';
import provincias from '../../../datos/provincias.json';
import combustible from '../../../datos/combustible.json';
import parametros from '../../../datos/parametros.json';
import indices from '../../../datos/indices.json';
import type { Datos } from './tipos.ts';

export const datos: Datos = {
  roles: roles.roles,
  grupos: items.grupos,
  exclusiones: items.exclusiones,
  items: items.items as unknown as Datos['items'],
  monotributo,
  provincias: provincias.provincias as unknown as Datos['provincias'],
  combustible,
  parametros,
  indices: indices as unknown as Datos['indices'],
};

export type * from './tipos.ts';
