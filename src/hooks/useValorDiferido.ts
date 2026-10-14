import { useEffect, useState } from 'react';

/**
 * Devuelve el valor recién cuando dejó de cambiar durante `espera` ms. Sirve
 * para que un lector de pantalla anuncie el total cuando se termina de
 * escribir «12» y no también el total intermedio de «1».
 */
export function useValorDiferido<T>(valor: T, espera: number): T {
  const [diferido, setDiferido] = useState(valor);
  useEffect(() => {
    const temporizador = setTimeout(() => setDiferido(valor), espera);
    return () => clearTimeout(temporizador);
  }, [valor, espera]);
  return diferido;
}
