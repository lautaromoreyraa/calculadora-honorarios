import { createContext, useContext } from 'react';
import { EN_PESOS, type Formato } from '../util/moneda.ts';

// La moneda elegida cruza toda la pantalla (aportes, subgrupos, desglose, barra,
// presupuesto): va por contexto en vez de pasar el formato de mano en mano.
const ContextoDeFormato = createContext<Formato>(EN_PESOS);

export const ProveedorDeFormato = ContextoDeFormato.Provider;

/** Cómo se escriben los montos en la moneda elegida (RF-28). */
export const useFormato = () => useContext(ContextoDeFormato);
