import { useId } from 'react';
import type { Exclusion, Item } from '../util/datos/tipos.ts';
import { NormaDelItem } from './NormaDelItem.tsx';

interface Props {
  exclusion: Exclusion;
  opciones: Item[];
  resumen: (item: Item) => string;
  elegido: string | null;
  alElegir: (itemId: string | null) => void;
  /** Si el título repite el de la sección, se oculta a la vista pero queda para lectores de pantalla. */
  tituloOculto?: boolean;
}

/** Un conjunto de ítems de los que se elige uno: radios. Si no es obligatorio, suma «Sin recargo». */
export function OpcionesExcluyentes({ exclusion, opciones, resumen, elegido, alElegir, tituloOculto }: Props) {
  const nombre = useId();
  return (
    <fieldset className="opciones">
      <legend className={tituloOculto ? 'solo-lectores' : 'opciones__titulo'}>
        {exclusion.nombre}
        {exclusion.obligatorio && <span className="opciones__obligatorio"> (obligatorio)</span>}
      </legend>
      {tituloOculto && exclusion.obligatorio && (
        <p className="opciones__nota" aria-hidden="true">
          Elegí una opción: es obligatorio.
        </p>
      )}
      {!exclusion.obligatorio && (
        <label className={`opcion${elegido === null ? ' opcion--elegida' : ''}`}>
          <input
            className="opcion__radio"
            type="radio"
            name={nombre}
            checked={elegido === null}
            onChange={() => alElegir(null)}
          />
          <span className="opcion__texto">
            <span className="opcion__nombre">Sin recargo</span>
          </span>
        </label>
      )}
      {opciones.map((item) => (
        <div className="opcion-con-norma" key={item.id}>
          <label className={`opcion${elegido === item.id ? ' opcion--elegida' : ''}`}>
            <input
              className="opcion__radio"
              type="radio"
              name={nombre}
              checked={elegido === item.id}
              onChange={() => alElegir(item.id)}
            />
            <span className="opcion__texto">
              <span className="opcion__nombre">{item.nombre}</span>
              <span className="opcion__resumen">{resumen(item)}</span>
            </span>
          </label>
          <NormaDelItem nombre={item.nombre} norma={item.norma} vigencia={item.vigencia} />
        </div>
      ))}
    </fieldset>
  );
}
