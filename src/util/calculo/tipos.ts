// Entrada y salida del motor de cálculo. La entrada es lo que el profesional
// eligió en la pantalla; la salida, el desglose que se muestra y se exporta.

/** Datos que pide un ítem marcado, según su tipo o fórmula. */
export interface EntradaDeItem {
  /** Precio del equipo, para las amortizaciones (RN-08). */
  precio?: number;
  /** Monto de un ítem por trabajo, como un alquiler. */
  monto?: number;
  /** Kilómetros a recorrer, para la movilidad (RN-10). */
  km?: number;
  /** Litros cada 100 km; si falta, el de los parámetros. */
  consumo?: number;
}

export interface Seleccion {
  rolId: string;
  provinciaId: string;
  /** Letra de la categoría de monotributo. */
  categoria: string;
  /** Horas del trabajo; hasta dos decimales. */
  horas: number;
  /** Años de ejercicio profesional: adicional por antigüedad y días de vacaciones. */
  antiguedad: number;
  /** Ítems marcados, por id, con los datos que piden. */
  items: Record<string, EntradaDeItem>;
}

export interface Renglon {
  /** Id del ítem, o `honorario-base`. */
  id: string;
  concepto: string;
  /** Cómo se calculó, en palabras, para la pantalla y el Word. */
  detalle: string;
  /** En pesos enteros (RN-11). */
  monto: number;
  /** Suma cero porque falta un dato del usuario, no porque valga cero. */
  falta?: true;
}

export interface Resultado {
  rol: { id: string; nombre: string; convenio: string; valorBaseMensual: number };
  /** Sin redondear: se muestra con centavos. */
  valorHora: number;
  horas: number;
  renglones: Renglon[];
  /** Suma de los renglones antes de ingresos brutos sobre lo facturado. */
  subtotal: number;
  /** Ingresos brutos sobre el total facturado (Corrientes), si se marcó. */
  ingresosBrutosSobreTotal?: Renglon;
  total: number;
  /** Ítems marcados a los que les falta un dato: suman cero. */
  avisos: string[];
}

/**
 * Un dato que falta para calcular. `campo` dice cuál, para que la pantalla
 * lleve a él: `rol`, `provincia`, `categoria`, `horas`, `antiguedad` o el id
 * de un conjunto excluyente.
 */
export interface Falta {
  campo: string;
  mensaje: string;
}

export type Calculo =
  | { ok: true; resultado: Resultado }
  | { ok: false; errores: Falta[] };
