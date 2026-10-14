import { useEffect, useMemo, useState } from 'react';
import { calcular } from '../util/calculo/index.ts';
import { formatoPara, type Moneda } from '../util/moneda.ts';
import type { Datos } from '../util/datos/tipos.ts';
import {
  aSeleccion,
  conAntiguedad,
  conVehiculo,
  estadoInicial,
  type Campo,
  type EstadoDelFormulario,
  type Vehiculo,
} from '../util/formulario.ts';
import {
  almacenDelNavegador,
  guardarPerfil,
  leerPerfil,
  olvidarPerfil,
  perfilDe,
  puedeRecordar,
  restaurar,
} from '../util/memoria.ts';

export type CampoGeneral =
  | 'rolId'
  | 'provinciaId'
  | 'categoria'
  | 'horas'
  | 'antiguedad'
  | 'profesional'
  | 'email'
  | 'telefono'
  | 'cuit'
  | 'condiciones';

/**
 * Estado del formulario y cálculo en vivo: cada cambio recalcula todo (RF-15).
 * Arranca con lo que el navegador recuerda de la visita anterior y guarda cada
 * cambio (RF-26).
 */
export function useCalculadora(datos: Datos) {
  const [estado, setEstado] = useState<EstadoDelFormulario>(() =>
    restaurar(leerPerfil(almacenDelNavegador()), datos),
  );
  // Lo que había antes de «Empezar de nuevo», para poder deshacerlo. Se
  // descarta con el primer cambio: deshacer después pisaría lo nuevo.
  const [anterior, setAnterior] = useState<EstadoDelFormulario | null>(null);
  // Cambia al reiniciar o deshacer: la página la usa de key para volver a
  // montar el formulario entero, con los plegables y los campos del presupuesto.
  const [vuelta, setVuelta] = useState(0);
  const [recuerda] = useState(() => puedeRecordar(almacenDelNavegador()));
  const formato = useMemo(() => formatoPara(estado.moneda, datos), [estado.moneda, datos]);
  const calculo = useMemo(() => calcular(aSeleccion(estado, datos), datos, formato), [estado, datos, formato]);

  useEffect(() => {
    guardarPerfil(almacenDelNavegador(), perfilDe(estado));
  }, [estado]);

  const actualizar = (cambio: (e: EstadoDelFormulario) => EstadoDelFormulario) => {
    setAnterior(null);
    setEstado(cambio);
  };

  return {
    estado,
    calculo,
    formato,
    vuelta,
    /** Si el navegador deja guardar: si no, la página no promete recordar nada. */
    recuerda,
    /** Hay un reinicio que se puede deshacer. */
    reiniciado: anterior !== null,
    cambiar: (campo: CampoGeneral, valor: string) =>
      actualizar((e) => (campo === 'antiguedad' ? conAntiguedad(e, valor, datos) : { ...e, [campo]: valor })),
    alternar: (itemId: string, marcado: boolean) =>
      actualizar((e) => ({ ...e, marcados: { ...e.marcados, [itemId]: marcado } })),
    elegir: (exclusionId: string, itemId: string | null) =>
      actualizar((e) => ({ ...e, elegidos: { ...e.elegidos, [exclusionId]: itemId } })),
    cargar: (itemId: string, campo: Campo, valor: string) =>
      actualizar((e) => ({ ...e, entradas: { ...e.entradas, [itemId]: { ...e.entradas[itemId], [campo]: valor } } })),
    elegirMoneda: (moneda: Moneda) => actualizar((e) => ({ ...e, moneda })),
    elegirVehiculo: (vehiculo: Vehiculo) => actualizar((e) => conVehiculo(e, vehiculo, datos)),
    empezarDeNuevo: () => {
      olvidarPerfil(almacenDelNavegador());
      setAnterior(estado);
      setEstado(estadoInicial(datos));
      setVuelta((v) => v + 1);
    },
    deshacer: () => {
      if (!anterior) return;
      setEstado(anterior);
      setAnterior(null);
      setVuelta((v) => v + 1);
    },
  };
}

export type Calculadora = ReturnType<typeof useCalculadora>;
