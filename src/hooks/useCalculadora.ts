import { useEffect, useMemo, useState } from 'react';
import { calcular } from '../util/calculo/index.ts';
import { formatoPara, type Moneda } from '../util/moneda.ts';
import type { Datos } from '../util/datos/tipos.ts';
import {
  aSeleccion,
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
  | 'categoria'
  | 'horas'
  | 'antiguedad'
  | 'profesional'
  | 'email'
  | 'telefono'
  | 'cuit'
  | 'condiciones';

export function useCalculadora(datos: Datos) {
  const [estado, setEstado] = useState<EstadoDelFormulario>(() =>
    restaurar(leerPerfil(almacenDelNavegador()), datos),
  );
  const [anterior, setAnterior] = useState<EstadoDelFormulario | null>(null);
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
    recuerda,
    reiniciado: anterior !== null,
    cambiar: (campo: CampoGeneral, valor: string) =>
      actualizar((e) => ({ ...e, [campo]: valor })),
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
