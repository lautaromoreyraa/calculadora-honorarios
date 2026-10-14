import { useId } from 'react';
import type { Item } from '../util/datos/tipos.ts';
import type { Campo } from '../util/formulario.ts';
import { CampoNumerico } from './CampoNumerico.tsx';
import { NormaDelItem } from './NormaDelItem.tsx';

/** Etiqueta, unidad y ayuda de cada dato que puede pedir un ítem. */
export interface DescripcionDeCampo {
  etiqueta: string;
  prefijo?: string;
  unidad?: string;
  ayuda?: string;
}

interface Props {
  item: Item;
  resumen: string;
  marcado: boolean;
  alAlternar: (marcado: boolean) => void;
  campos: Campo[];
  describirCampo: (campo: Campo) => DescripcionDeCampo;
  entradas: Partial<Record<Campo, string>>;
  alCargar: (campo: Campo, valor: string) => void;
}

export function ItemConCasilla({ item, resumen, marcado, alAlternar, campos, describirCampo, entradas, alCargar }: Props) {
  const id = useId();
  return (
    <div className={`item${marcado ? ' item--marcado' : ''}`}>
      <div className="item__fila">
        <input
          id={id}
          className="item__casilla"
          type="checkbox"
          checked={marcado}
          aria-describedby={`${id}-resumen`}
          onChange={(e) => alAlternar(e.target.checked)}
        />
        <label className="item__etiqueta" htmlFor={id}>
          <span className="item__nombre">{item.nombre}</span>
          <span className="item__resumen" id={`${id}-resumen`}>
            {resumen}
          </span>
        </label>
      </div>
      {item.descripcion && <p className="item__descripcion">{item.descripcion}</p>}
      <NormaDelItem nombre={item.nombre} norma={item.norma} vigencia={item.vigencia} />
      {marcado && campos.length > 0 && (
        <div className="item__campos">
          {campos.map((campo) => {
            const d = describirCampo(campo);
            return (
              <CampoNumerico
                key={campo}
                etiqueta={d.etiqueta}
                prefijo={d.prefijo}
                unidad={d.unidad}
                ayuda={d.ayuda}
                valor={entradas[campo] ?? ''}
                alCambiar={(v) => alCargar(campo, v)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
