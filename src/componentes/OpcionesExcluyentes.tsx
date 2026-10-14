import { useId } from 'react';
import type { Exclusion, Item } from '../util/datos/tipos.ts';
import { formatearPesos } from '../util/formato.ts';
import { idDeCampo } from '../util/formulario.ts';
import { NormaDelItem } from './NormaDelItem.tsx';

interface Props {
  exclusion: Exclusion;
  opciones: Item[];
  resumen: (item: Item) => string;
  elegido: string | null;
  alElegir: (itemId: string | null) => void;
  /** Cuánto suma la opción elegida a este trabajo, si hay un cálculo. */
  aporte?: number;
  /** Si el título repite el de la sección, se oculta a la vista pero queda para lectores de pantalla. */
  tituloOculto?: boolean;
}

/** Un conjunto de ítems de los que se elige uno: radios. Si no es obligatorio, suma «Sin recargo». */
export function OpcionesExcluyentes({ exclusion, opciones, resumen, elegido, alElegir, aporte, tituloOculto }: Props) {
  const nombre = useId();
  // El primer radio lleva el id del conjunto: ahí lleva la lista de lo que falta.
  const idPrimero = idDeCampo(exclusion.id);
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
            id={idPrimero}
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
      {opciones.map((item, i) => (
        // La norma va dentro del mismo recuadro que su opción: suelta entre dos
        // tarjetas no se sabía de cuál era.
        <div className={`opcion-con-norma${elegido === item.id ? ' opcion-con-norma--elegida' : ''}`} key={item.id}>
          <label className="opcion">
            <input
              id={exclusion.obligatorio && i === 0 ? idPrimero : undefined}
              className="opcion__radio"
              type="radio"
              name={nombre}
              required={exclusion.obligatorio}
              checked={elegido === item.id}
              onChange={() => alElegir(item.id)}
            />
            <span className="opcion__texto">
              <span className="opcion__nombre">{item.nombre}</span>
              <span className="opcion__resumen">{resumen(item)}</span>
              {elegido === item.id && aporte !== undefined && (
                <span className="item__aporte">Suma {formatearPesos(aporte)} a este trabajo</span>
              )}
            </span>
          </label>
          <NormaDelItem nombre={item.nombre} norma={item.norma} vigencia={item.vigencia} />
        </div>
      ))}
    </fieldset>
  );
}
