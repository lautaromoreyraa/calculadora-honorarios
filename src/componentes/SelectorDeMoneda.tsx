import { useId } from 'react';
import { formatearPesos } from '../util/formato.ts';
import { formatearFecha } from '../util/formulario.ts';
import type { Cotizacion, Moneda } from '../util/moneda.ts';

interface Props {
  valor: Moneda;
  alElegir: (moneda: Moneda) => void;
  cotizacion: Cotizacion;
}

const MONEDAS: { id: Moneda; nombre: string }[] = [
  { id: 'ARS', nombre: 'Pesos' },
  { id: 'USD', nombre: 'Dólares' },
];

export function SelectorDeMoneda({ valor, alElegir, cotizacion }: Props) {
  const nombre = useId();
  return (
    <div className="selector-de-moneda">
      <fieldset className="selector-de-moneda__opciones">
        <legend className="solo-lectores">Moneda de los montos</legend>
        {MONEDAS.map((m) => (
          <label key={m.id} className={`selector-de-moneda__opcion${valor === m.id ? ' selector-de-moneda__opcion--elegida' : ''}`}>
            <input
              className="solo-lectores"
              type="radio"
              name={nombre}
              checked={valor === m.id}
              onChange={() => alElegir(m.id)}
            />
            {m.nombre}
          </label>
        ))}
      </fieldset>
      {valor === 'USD' && (
        <p className="selector-de-moneda__nota">
          Al dólar blue de {formatearPesos(cotizacion.valor)} del {formatearFecha(cotizacion.fecha)}. Lo que cargás sigue
          en pesos.
        </p>
      )}
    </div>
  );
}
