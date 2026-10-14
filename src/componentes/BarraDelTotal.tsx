import { useEffect, useRef, useState } from 'react';
import type { Calculo } from '../util/calculo/tipos.ts';
import { useFormato } from '../contexto/Moneda.tsx';

interface Props {
  calculo: Calculo;
}

/** Lo que ya muestra el total: con cualquiera de los dos a la vista, la barra sobra. */
const QUE_MUESTRAN_EL_TOTAL = ['resultado', 'presupuesto'];

// En el celular el desglose queda debajo del formulario: esta barra muestra el
// total mientras se marcan casillas y lleva al desglose. No anuncia cambios a
// los lectores de pantalla: eso lo hace el total del desglose.
export function BarraDelTotal({ calculo }: Props) {
  const formato = useFormato();
  const barra = useRef<HTMLDivElement>(null);
  const [totalALaVista, setTotalALaVista] = useState(false);

  // #presupuesto aparece recién con un resultado: se vuelve a observar cuando cambia.
  useEffect(() => {
    if (!('IntersectionObserver' in window)) return;
    const visibles = new Set<string>();
    const observador = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (e.isIntersecting) visibles.add(e.target.id);
          else visibles.delete(e.target.id);
        }
        setTotalALaVista(visibles.size > 0);
      },
      { threshold: 0.15 },
    );
    for (const id of QUE_MUESTRAN_EL_TOTAL) {
      const el = document.getElementById(id);
      if (el) observador.observe(el);
    }
    return () => observador.disconnect();
  }, [calculo.ok]);

  // El pie y el margen de scroll dejan lugar para la barra según su alto real:
  // con el texto agrandado mide el doble y tapaba el final de la página.
  useEffect(() => {
    const el = barra.current;
    if (!el || !('ResizeObserver' in window)) return;
    const raiz = document.documentElement;
    const observador = new ResizeObserver(() => raiz.style.setProperty('--alto-barra', `${el.offsetHeight}px`));
    observador.observe(el);
    return () => {
      observador.disconnect();
      raiz.style.removeProperty('--alto-barra');
    };
  }, []);

  return (
    <div
      ref={barra}
      className={`barra-del-total${totalALaVista ? ' barra-del-total--oculta' : ''}`}
      aria-hidden={totalALaVista || undefined}
    >
      {calculo.ok ? (
        <span className="barra-del-total__monto">{formato.monto(calculo.resultado.total)}</span>
      ) : (
        <span className="barra-del-total__monto barra-del-total__monto--vacio">Faltan datos</span>
      )}
      <a className="barra-del-total__enlace" href="#resultado" tabIndex={totalALaVista ? -1 : undefined}>
        {calculo.ok ? 'Ver desglose' : 'Ver qué falta'}
      </a>
    </div>
  );
}
