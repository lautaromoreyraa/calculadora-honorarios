import { useEffect, useMemo, useState } from 'react';
import { calcular } from '../util/calculo/index.ts';
import type { Datos } from '../util/datos/tipos.ts';
import { aSeleccion, estadoInicial, type Campo, type EstadoDelFormulario } from '../util/formulario.ts';
import { almacenDelNavegador, guardarPerfil, leerPerfil, olvidarPerfil, perfilDe, restaurar } from '../util/memoria.ts';

type CampoGeneral = 'rolId' | 'provinciaId' | 'categoria' | 'horas' | 'antiguedad' | 'profesional';

/**
 * Estado del formulario y cálculo en vivo: cada cambio recalcula todo (RF-15).
 * Arranca con lo que el navegador recuerda de la visita anterior y guarda cada
 * cambio (RF-26).
 */
export function useCalculadora(datos: Datos) {
  const [estado, setEstado] = useState<EstadoDelFormulario>(() =>
    restaurar(leerPerfil(almacenDelNavegador()), datos),
  );
  // Cambia con «Empezar de nuevo»: la página la usa de key para volver a montar
  // el formulario entero, con los plegables y los campos del presupuesto.
  const [vuelta, setVuelta] = useState(0);
  const calculo = useMemo(() => calcular(aSeleccion(estado, datos), datos), [estado, datos]);

  useEffect(() => {
    guardarPerfil(almacenDelNavegador(), perfilDe(estado));
  }, [estado]);

  return {
    estado,
    calculo,
    vuelta,
    cambiar: (campo: CampoGeneral, valor: string) => setEstado((e) => ({ ...e, [campo]: valor })),
    alternar: (itemId: string, marcado: boolean) =>
      setEstado((e) => ({ ...e, marcados: { ...e.marcados, [itemId]: marcado } })),
    elegir: (exclusionId: string, itemId: string | null) =>
      setEstado((e) => ({ ...e, elegidos: { ...e.elegidos, [exclusionId]: itemId } })),
    cargar: (itemId: string, campo: Campo, valor: string) =>
      setEstado((e) => ({ ...e, entradas: { ...e.entradas, [itemId]: { ...e.entradas[itemId], [campo]: valor } } })),
    empezarDeNuevo: () => {
      olvidarPerfil(almacenDelNavegador());
      setEstado(estadoInicial(datos));
      setVuelta((v) => v + 1);
    },
  };
}

export type Calculadora = ReturnType<typeof useCalculadora>;
