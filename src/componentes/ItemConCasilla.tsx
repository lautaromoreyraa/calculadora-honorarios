import { useId, type ReactNode } from 'react';
import type { Item } from '../util/datos/tipos.ts';
import type { Aporte as DatosDelAporte, Campo } from '../util/formulario.ts';
import { Aporte } from './Aporte.tsx';
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
  /** Cuánto suma a este trabajo, si está marcado y hay un cálculo. */
  aporte?: DatosDelAporte;
  alAlternar: (marcado: boolean) => void;
  campos: Campo[];
  describirCampo: (campo: Campo) => DescripcionDeCampo;
  entradas: Partial<Record<Campo, string>>;
  alCargar: (campo: Campo, valor: string) => void;
  /** Un control propio del ítem, antes de sus campos: el vehículo de la movilidad. */
  antesDeLosCampos?: ReactNode;
}

export function ItemConCasilla({
  item,
  resumen,
  marcado,
  aporte,
  alAlternar,
  campos,
  describirCampo,
  entradas,
  alCargar,
  antesDeLosCampos,
}: Props) {
  const id = useId();
  return (
    <div className={`item${marcado ? ' item--marcado' : ''}`}>
      {/* La etiqueta envuelve la casilla y ocupa todo el ancho de la tarjeta:
          tocar cualquier parte del texto la marca, no sólo el cuadradito. */}
      <label className="item__fila">
        <input
          className="item__casilla"
          type="checkbox"
          checked={marcado}
          // La etiqueta envuelve toda la tarjeta: el nombre accesible es sólo el
          // nombre del ítem, y lo demás va como descripción, una sola vez.
          aria-labelledby={`${id}-nombre`}
          aria-describedby={`${id}-resumen ${id}-aporte`}
          onChange={(e) => alAlternar(e.target.checked)}
        />
        <span className="item__etiqueta">
          <span className="item__nombre" id={`${id}-nombre`}>
            {item.nombre}
          </span>
          <span className="item__resumen" id={`${id}-resumen`}>
            {resumen}
          </span>
          <Aporte id={`${id}-aporte`} aporte={aporte} />
          {item.descripcion && <span className="item__descripcion">{item.descripcion}</span>}
        </span>
      </label>
      {marcado && campos.length > 0 && (
        <div className="item__campos">
          {antesDeLosCampos}
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
      {item.norma && <NormaDelItem nombre={item.nombre} norma={item.norma} vigencia={item.vigencia} />}
    </div>
  );
}
