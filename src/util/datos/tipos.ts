import type { RangoDeVariacion } from '../actualizacion/validacion.ts';
import type { Indices } from '../indices.ts';


export type Vigencia = string;

export interface Escala {
  origen: Vigencia;
  fuente: string;
}

export interface Rol {
  id: string;
  nombre: string;
  valorBaseMensual: number;
  convenio: string;
  escala: Escala;
  vigencia: Vigencia;
}

export interface Grupo {
  id: string;
  nombre: string;
  tituloDeLosItems?: string;
  subgrupos?: Subgrupo[];
}

export interface Subgrupo {
  id: string;
  nombre: string;
}

export interface Exclusion {
  id: string;
  nombre: string;
  obligatorio: boolean;
}

export type ReglaDeActualizacion = 'manual' | 'escala' | 'ipc-nea' | 'dolar-oficial' | 'combustible' | 'fija';

export interface Dolares {
  herramientas: { nombre: string; precio: number }[];
  proporcion: number;
}

interface ItemBase {
  id: string;
  nombre: string;
  descripcion?: string;
  grupo: string;
  subgrupo?: string;
  exclusion?: string;
  norma?: string;
  actualizacion: {
    regla: ReglaDeActualizacion;
    origen?: Vigencia;
    fuente?: string;
    serie?: 'general' | 'comunicacion';
  };
  vigencia: Vigencia;
}

export interface ItemPorcentual extends ItemBase {
  tipo: 'porcentual';
  porcentaje: number;
  porRol?: Record<string, { porcentaje: number }>;
}

export interface ItemMensual extends ItemBase {
  tipo: 'mensual';
  valor?: number;
  dolares?: Dolares;
  multiplicaPor?: 'antiguedad';
  porRol?: Record<string, { valor?: number; dolares?: Dolares; escala?: Escala }>;
}

export interface ItemPorJornada extends ItemBase {
  tipo: 'por-jornada';
  valor: number;
}

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
  aclaracion?: string;
}

export interface Parametros {
  horasMensuales: Parametro;
  horasPorJornada: Parametro;
  vidaUtilDeEquiposEnMeses: Parametro;
  consumoDelAutoCada100Km: Parametro;
  consumoDeLaMotoCada100Km: Parametro;
  vacaciones: {
    divisorDelDia: number;
    diasPorAntiguedad: { desdeAnios: number; dias: number }[];
    norma: string;
  };
  sueldoAnualComplementario: { sueldosPorAnio: number; norma: string };
  dolarOficial: { valor: number; fecha: string; fuente: string };
  dolarBlue: { valor: number; fecha: string; fuente: string };
  encuesta?: { url: string };
  rangosDeVariacion: Record<'dolar' | 'ipc' | 'salarios' | 'combustible', RangoDeVariacion>;
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
    precios: Record<string, PrecioDeCombustible>;
  };
  parametros: Parametros;
  indices: Indices;
}
