import { useEffect, useRef, useState } from 'react';

const DURACION = 450;
/** Desaceleración exponencial: llega rápido y se asienta, sin rebote. */
const salida = (t: number) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t));

function prefiereMenosMovimiento(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/**
 * El total cuenta hasta su valor nuevo (RNF-13): se ve cuánto cambió al marcar
 * una casilla. Arranca en el valor anterior, nunca en cero, y termina siempre
 * exacto en el nuevo. Con «reducir movimiento», salta directo.
 */
export function useNumeroAnimado(valor: number): number {
  const [mostrado, setMostrado] = useState(valor);
  const desde = useRef(valor);

  useEffect(() => {
    const inicio = desde.current;
    if (inicio === valor || prefiereMenosMovimiento()) {
      desde.current = valor;
      setMostrado(valor);
      return;
    }
    let cuadro = 0;
    const t0 = performance.now();
    const paso = (ahora: number) => {
      const t = Math.min(1, (ahora - t0) / DURACION);
      const actual = inicio + (valor - inicio) * salida(t);
      desde.current = actual;
      setMostrado(t >= 1 ? valor : actual);
      if (t < 1) cuadro = requestAnimationFrame(paso);
    };
    cuadro = requestAnimationFrame(paso);
    // Si cambia a mitad de camino, la próxima arranca desde donde quedó.
    return () => cancelAnimationFrame(cuadro);
  }, [valor]);

  return mostrado;
}
