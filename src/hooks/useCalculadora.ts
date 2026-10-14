import { useMemo, useState } from 'react';
import { calcular } from '../util/calculo/index.ts';
import type { Datos } from '../util/datos/tipos.ts';
import { aSeleccion, estadoInicial, type Campo, type EstadoDelFormulario } from '../util/formulario.ts';

type CampoGeneral = 'rolId' | 'provinciaId' | 'categoria' | 'horas' | 'antiguedad';

/** Estado del formulario y cálculo en vivo: cada cambio recalcula todo (RF-15). */
export function useCalculadora(datos: Datos) {
  const [estado, setEstado] = useState<EstadoDelFormulario>(() => estadoInicial(datos));
  const calculo = useMemo(() => calcular(aSeleccion(estado, datos), datos), [estado, datos]);

  return {
    estado,
    calculo,
    cambiar: (campo: CampoGeneral, valor: string) => setEstado((e) => ({ ...e, [campo]: valor })),
    alternar: (itemId: string, marcado: boolean) =>
      setEstado((e) => ({ ...e, marcados: { ...e.marcados, [itemId]: marcado } })),
    elegir: (exclusionId: string, itemId: string | null) =>
      setEstado((e) => ({ ...e, elegidos: { ...e.elegidos, [exclusionId]: itemId } })),
    cargar: (itemId: string, campo: Campo, valor: string) =>
      setEstado((e) => ({ ...e, entradas: { ...e.entradas, [itemId]: { ...e.entradas[itemId], [campo]: valor } } })),
  };
}

export type Calculadora = ReturnType<typeof useCalculadora>;
