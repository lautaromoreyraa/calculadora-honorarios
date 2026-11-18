import type { Cotizacion, Moneda } from '../moneda.ts';


export interface EntradaDeItem {
  precio?: number;
  monto?: number;
  km?: number;
  consumo?: number;
}

export interface Seleccion {
  rolId: string;
  transportePrivado?: boolean;
  categoria: string;
  horas: number;
  antiguedad: number;
  items: Record<string, EntradaDeItem>;
}

export interface Renglon {
  id: string;
  concepto: string;
  detalle: string;
  monto: number;
  falta?: true;
}

export interface Resultado {
  rol: {
    id: string;
    nombre: string;
    convenio: string;
    valorBaseMensual: number;
    escala: string;
  };
  valorHora: number;
  horas: number;
  renglones: Renglon[];
  subtotal: number;
  ingresosBrutosSobreTotal?: Renglon;
  total: number;
  avisos: string[];
  moneda: Moneda;
  cotizacion?: Cotizacion;
}

export interface Falta {
  campo: string;
  mensaje: string;
}

export type Calculo =
  | { ok: true; resultado: Resultado }
  | { ok: false; errores: Falta[] };
