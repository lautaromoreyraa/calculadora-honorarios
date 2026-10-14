import type { Calculo } from '../util/calculo/tipos.ts';
import { formatearPesos } from '../util/formato.ts';

interface Props {
  calculo: Calculo;
}

// En el celular el desglose queda debajo del formulario: esta barra muestra el
// total mientras se marcan casillas y lleva al desglose. No anuncia cambios a
// los lectores de pantalla: eso lo hace el total del desglose.
export function BarraDelTotal({ calculo }: Props) {
  return (
    <div className="barra-del-total">
      {calculo.ok ? (
        <span className="barra-del-total__monto">{formatearPesos(calculo.resultado.total)}</span>
      ) : (
        <span className="barra-del-total__monto barra-del-total__monto--vacio">Faltan datos</span>
      )}
      <a className="barra-del-total__enlace" href="#resultado">
        Ver desglose
      </a>
    </div>
  );
}
