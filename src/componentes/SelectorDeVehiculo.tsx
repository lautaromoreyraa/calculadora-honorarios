import { useId } from 'react';
import type { Vehiculo } from '../util/formulario.ts';

interface Props {
  valor: Vehiculo;
  alElegir: (vehiculo: Vehiculo) => void;
}

const VEHICULOS: { id: Vehiculo; nombre: string }[] = [
  { id: 'auto', nombre: 'Auto' },
  { id: 'moto', nombre: 'Moto' },
  { id: 'privado', nombre: 'Transporte privado' },
];

export function SelectorDeVehiculo({ valor, alElegir }: Props) {
  const nombre = useId();
  return (
    <fieldset className="opciones opciones--en-linea selector-de-vehiculo">
      <legend className="opciones__titulo">Cómo vas</legend>
      {VEHICULOS.map((v) => (
        <label key={v.id} className={`opcion${valor === v.id ? ' opcion--elegida' : ''}`}>
          <input
            className="opcion__radio"
            type="radio"
            name={nombre}
            checked={valor === v.id}
            onChange={() => alElegir(v.id)}
          />
          <span className="opcion__texto">
            <span className="opcion__nombre">{v.nombre}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}
