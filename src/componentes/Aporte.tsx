import { formatearPesos } from '../util/formato.ts';
import type { Aporte as DatosDelAporte } from '../util/formulario.ts';

interface Props {
  id: string;
  aporte?: DatosDelAporte;
}

/**
 * Cuánto suma un ítem marcado a este trabajo. Si suma cero porque falta un
 * dato, lo dice; si vale cero de por sí (cliente A), no dice nada: «Suma $ 0»
 * se leía como un error del cálculo.
 */
export function Aporte({ id, aporte }: Props) {
  if (!aporte) return null;
  if (aporte.falta) {
    return (
      <span className="item__aporte item__aporte--falta" id={id}>
        Falta un dato: todavía no suma
      </span>
    );
  }
  if (aporte.monto === 0) return null;
  return (
    <span className="item__aporte" id={id}>
      Suma {formatearPesos(aporte.monto)} a este trabajo
    </span>
  );
}
