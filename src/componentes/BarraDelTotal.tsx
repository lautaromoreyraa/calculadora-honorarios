import { useEffect, useState } from 'react';
import type { Calculo } from '../util/calculo/tipos.ts';
import { formatearPesos } from '../util/formato.ts';

interface Props {
  calculo: Calculo;
}

// En el celular el desglose queda debajo del formulario: esta barra muestra el
// total mientras se marcan casillas y lleva al desglose. No anuncia cambios a
// los lectores de pantalla: eso lo hace el total del desglose.
export function BarraDelTotal({ calculo }: Props) {
  // Con el resultado en pantalla, la barra repetía el total y llevaba a donde ya se estaba.
  const [resultadoALaVista, setResultadoALaVista] = useState(false);
  useEffect(() => {
    const resultado = document.getElementById('resultado');
    if (!resultado || !('IntersectionObserver' in window)) return;
    const observador = new IntersectionObserver(([entrada]) => setResultadoALaVista(entrada.isIntersecting), {
      threshold: 0.15,
    });
    observador.observe(resultado);
    return () => observador.disconnect();
  }, []);

  return (
    <div
      className={`barra-del-total${resultadoALaVista ? ' barra-del-total--oculta' : ''}`}
      aria-hidden={resultadoALaVista || undefined}
    >
      {calculo.ok ? (
        <span className="barra-del-total__monto">{formatearPesos(calculo.resultado.total)}</span>
      ) : (
        <span className="barra-del-total__monto barra-del-total__monto--vacio">Faltan datos</span>
      )}
      <a className="barra-del-total__enlace" href="#resultado" tabIndex={resultadoALaVista ? -1 : undefined}>
        {calculo.ok ? 'Ver desglose' : 'Ver qué falta'}
      </a>
    </div>
  );
}
