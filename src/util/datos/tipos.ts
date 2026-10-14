// Forma de los archivos de datos/. Espeja datos/esquema/*.schema.json: el esquema
// es el que valida (en la verificación de cada PR) y estos tipos son los que usa
// el código. Si se cambia uno, se cambia el otro.

/** Mes desde el que rige un valor, AAAA-MM. */
export type Vigencia = string;

export interface Rol {
  id: string;
  nombre: string;
  valorBaseMensual: number;
  convenio: string;
  vigencia: Vigencia;
}

export interface Grupo {
  id: string;
  nombre: string;
  /** Subtítulo de las casillas cuando el grupo también tiene opciones excluyentes. */
  tituloDeLosItems?: string;
}

/** Conjunto de ítems de los que se elige uno solo. */
export interface Exclusion {
  id: string;
  nombre: string;
  obligatorio: boolean;
}

export type ReglaDeActualizacion = 'manual' | 'ipc-nea' | 'dolar-oficial' | 'combustible' | 'fija';

export interface Dolares {
  herramientas: { nombre: string; precio: number }[];
  /** Fracción del precio que se cobra: 0,5 es «50 % de la cotización oficial». */
  proporcion: number;
}

interface ItemBase {
  id: string;
  nombre: string;
  descripcion?: string;
  grupo: string;
  exclusion?: string;
  norma: string;
  actualizacion: { regla: ReglaDeActualizacion; origen?: Vigencia };
  vigencia: Vigencia;
}

/** Porcentaje del valor hora por las horas del trabajo (RN-02). */
export interface ItemPorcentual extends ItemBase {
  tipo: 'porcentual';
  porcentaje: number;
  porRol?: Record<string, { porcentaje: number }>;
}

/** Costo mensual que se prorratea por hora (RN-03), en pesos o en dólares (RN-15). */
export interface ItemMensual extends ItemBase {
  tipo: 'mensual';
  valor?: number;
  dolares?: Dolares;
  multiplicaPor?: 'antiguedad';
  porRol?: Record<string, { valor?: number; dolares?: Dolares }>;
}

/** Monto por jornada de trabajo (RN-14). */
export interface ItemPorJornada extends ItemBase {
  tipo: 'por-jornada';
  valor: number;
}

/** Monto que carga el usuario, una vez por trabajo. */
export interface ItemPorTrabajo extends ItemBase {
  tipo: 'por-trabajo';
}

export type Formula =
  | 'monotributo'
  | 'ingresos-brutos'
  | 'fondo-vacaciones'
  | 'fondo-sac'
  | 'amortizacion'
  | 'movilidad';

/** Ítem con una fórmula propia del motor de cálculo. */
export interface ItemCalculado extends ItemBase {
  tipo: 'calculado';
  formula: Formula;
}

export type Item = ItemPorcentual | ItemMensual | ItemPorJornada | ItemPorTrabajo | ItemCalculado;

export interface CategoriaDeMonotributo {
  letra: string;
  topeAnual: number;
  impuestoIntegrado: number;
  sipa: number;
  obraSocial: number;
  vigencia: Vigencia;
}

export type IngresosBrutos =
  | {
      modo: 'fijo-por-categoria';
      /** Monto mensual por letra de categoría de monotributo. */
      montos: Record<string, number>;
      norma: string;
      fuente?: string;
      vigencia: Vigencia;
    }
  | {
      modo: 'alicuota';
      alicuota: number;
      norma: string;
      fuente?: string;
      vigencia: Vigencia;
    };

export interface Provincia {
  id: string;
  nombre: string;
  ingresosBrutos: IngresosBrutos;
}

export interface PrecioDeCombustible {
  precio: number;
  fecha: string;
  estaciones: number;
}

export interface Parametro {
  valor: number;
  norma: string;
}

export interface Parametros {
  horasMensuales: Parametro;
  horasPorJornada: Parametro;
  vidaUtilDeEquiposEnMeses: Parametro;
  consumoDelAutoCada100Km: Parametro;
  vacaciones: {
    divisorDelDia: number;
    diasPorAntiguedad: { desdeAnios: number; dias: number }[];
    norma: string;
  };
  sueldoAnualComplementario: { sueldosPorAnio: number; norma: string };
  dolarOficial: { valor: number; fecha: string; fuente: string };
}

export interface Datos {
  roles: Rol[];
  grupos: Grupo[];
  exclusiones: Exclusion[];
  items: Item[];
  monotributo: { norma: string; fuente: string; categorias: CategoriaDeMonotributo[] };
  provincias: Provincia[];
  combustible: {
    producto: string;
    criterio: string;
    fuente: string;
    /** Por id de provincia. */
    precios: Record<string, PrecioDeCombustible>;
  };
  parametros: Parametros;
}
