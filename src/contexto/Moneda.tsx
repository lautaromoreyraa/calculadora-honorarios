import { createContext, useContext } from 'react';
import { EN_PESOS, type Formato } from '../util/moneda.ts';

const ContextoDeFormato = createContext<Formato>(EN_PESOS);

export const ProveedorDeFormato = ContextoDeFormato.Provider;

export const useFormato = () => useContext(ContextoDeFormato);
