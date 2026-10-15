import { useEffect, useRef } from 'react';

/**
 * Publica el alto real del elemento en la custom property `variable`, sobre el
 * mismo elemento. El CSS no puede leer el alto de una caja para calcular su
 * propio `top`: el desglose fijo lo necesita para no cortarse cuando pasa el
 * alto de la pantalla (RNF-14).
 */
export function useAltoEnVariable<T extends HTMLElement>(variable: string) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !('ResizeObserver' in window)) return;
    const observador = new ResizeObserver(() => el.style.setProperty(variable, `${el.offsetHeight}px`));
    observador.observe(el);
    return () => {
      observador.disconnect();
      el.style.removeProperty(variable);
    };
  }, [variable]);
  return ref;
}
