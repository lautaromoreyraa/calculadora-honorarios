import { useEffect, useRef, useState } from 'react';
import type { Calculo } from '../util/calculo/tipos.ts';
import { useFormato } from '../contexto/Moneda.tsx';
import { datosQueFaltan, textoDeLoQueFalta } from '../util/formulario.ts';

interface Props {
  calculo: Calculo;
}

const QUE_MUESTRAN_EL_TOTAL = ['resultado', 'presupuesto'];

export function BarraDelTotal({ calculo }: Props) {
  const formato = useFormato();
  const faltan = datosQueFaltan(calculo);
  const barra = useRef<HTMLDivElement>(null);
  const [totalALaVista, setTotalALaVista] = useState(false);

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
        <span className="barra-del-total__resultado">
          <span className="barra-del-total__monto">{formato.monto(calculo.resultado.total)}</span>
          {faltan > 0 && <span className="barra-del-total__falta">{textoDeLoQueFalta(faltan)}</span>}
        </span>
      ) : (
        <span className="barra-del-total__monto barra-del-total__monto--vacio">{textoDeLoQueFalta(faltan)}</span>
      )}
      <a className="barra-del-total__enlace" href="#resultado" tabIndex={totalALaVista ? -1 : undefined}>
        {calculo.ok && faltan === 0 ? 'Ver desglose' : 'Ver qué falta'}
      </a>
    </div>
  );
}
