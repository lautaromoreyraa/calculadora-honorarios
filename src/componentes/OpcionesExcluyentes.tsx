import { useId } from 'react';
import type { Exclusion, Item } from '../util/datos/tipos.ts';
import { idDeCampo, type Aporte as DatosDelAporte } from '../util/formulario.ts';
import { Aporte } from './Aporte.tsx';
import { NormaDelItem } from './NormaDelItem.tsx';

interface Props {
  exclusion: Exclusion;
  opciones: Item[];
  resumen: (item: Item) => string;
  elegido: string | null;
  alElegir: (itemId: string | null) => void;
  aporte?: DatosDelAporte;
  tituloOculto?: boolean;
}

export function OpcionesExcluyentes({ exclusion, opciones, resumen, elegido, alElegir, aporte, tituloOculto }: Props) {
  const nombre = useId();
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
        <div className={`opcion-con-norma${elegido === item.id ? ' opcion-con-norma--elegida' : ''}`} key={item.id}>
          <label className="opcion">
            <input
              id={exclusion.obligatorio && i === 0 ? idPrimero : undefined}
              className="opcion__radio"
              type="radio"
              name={nombre}
              required={exclusion.obligatorio}
              aria-labelledby={`${nombre}-${item.id}-nombre`}
              aria-describedby={`${nombre}-${item.id}-resumen ${nombre}-${item.id}-aporte`}
              checked={elegido === item.id}
              onChange={() => alElegir(item.id)}
            />
            <span className="opcion__texto">
              <span className="opcion__nombre" id={`${nombre}-${item.id}-nombre`}>
                {item.nombre}
              </span>
              <span className="opcion__resumen" id={`${nombre}-${item.id}-resumen`}>
                {resumen(item)}
              </span>
              <Aporte id={`${nombre}-${item.id}-aporte`} aporte={elegido === item.id ? aporte : undefined} />
            </span>
          </label>
          {item.norma && <NormaDelItem nombre={item.nombre} norma={item.norma} vigencia={item.vigencia} />}
        </div>
      ))}
    </fieldset>
  );
}
