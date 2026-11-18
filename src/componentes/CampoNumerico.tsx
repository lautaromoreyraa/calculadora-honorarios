import { useId } from 'react';

interface Props {
  etiqueta: string;
  valor: string;
  alCambiar: (valor: string) => void;
  ayuda?: string;
  unidad?: string;
  prefijo?: string;
  error?: string;
  placeholder?: string;
  id?: string;
}

export function CampoNumerico({ etiqueta, valor, alCambiar, ayuda, unidad, prefijo, error, placeholder, id: idFijo }: Props) {
  const idPropio = useId();
  const id = idFijo ?? idPropio;
  const descripcion = [ayuda && `${id}-ayuda`, error && `${id}-error`].filter(Boolean).join(' ') || undefined;
  return (
    <div className="campo">
      <label className="campo__etiqueta" htmlFor={id}>
        {etiqueta}
      </label>
      <div className={`campo__control${error ? ' campo__control--error' : ''}`}>
        {prefijo && <span className="campo__afijo" aria-hidden="true">{prefijo}</span>}
        <input
          id={id}
          className="campo__entrada"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={valor}
          placeholder={placeholder}
          aria-describedby={descripcion}
          aria-invalid={error ? true : undefined}
          onChange={(e) => alCambiar(e.target.value)}
        />
        {unidad && <span className="campo__afijo" aria-hidden="true">{unidad}</span>}
      </div>
      {ayuda && (
        <p className="campo__ayuda" id={`${id}-ayuda`}>
          {ayuda}
        </p>
      )}
      {error && (
        <p className="campo__error" id={`${id}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}
