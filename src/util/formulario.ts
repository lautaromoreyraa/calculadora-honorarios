// Estado del formulario y su traducción a la Seleccion que entiende el motor.
// Vive fuera de React para poder probarlo sin DOM: la pantalla sólo guarda este
// estado y lo pasa por aSeleccion en cada cambio.
import type { Datos, Item } from './datos/tipos.ts';
import type { EntradaDeItem, Seleccion } from './calculo/tipos.ts';
import { diasDeVacaciones, valorMensual } from './calculo/index.ts';
import { formatearNumero, formatearPesos, formatearPesosConCentavos, formatearPorcentaje } from './formato.ts';

/** Lo que pide un ítem marcado. */
export type Campo = keyof EntradaDeItem;

export interface EstadoDelFormulario {
  rolId: string;
  provinciaId: string;
  categoria: string;
  /** Texto tal cual lo escribe el usuario: «1,5» o «1.5». */
  horas: string;
  antiguedad: string;
  /** Casillas marcadas, por id de ítem. */
  marcados: Record<string, boolean>;
  /** Opción elegida en cada conjunto excluyente, por id de exclusión; null es «ninguna». */
  elegidos: Record<string, string | null>;
  /** Datos que cargó el usuario para cada ítem, como texto. */
  entradas: Record<string, Partial<Record<Campo, string>>>;
  /** Nombre del profesional para el presupuesto; vive acá para poder recordarlo (RF-26). */
  profesional: string;
}

export function estadoInicial(datos: Datos): EstadoDelFormulario {
  return {
    rolId: datos.roles[0].id,
    provinciaId: datos.provincias[0].id,
    categoria: datos.monotributo.categorias[0].letra,
    horas: '',
    antiguedad: '0',
    marcados: {},
    elegidos: Object.fromEntries(datos.exclusiones.map((e) => [e.id, null])),
    // El consumo arranca en el del parámetro y el usuario lo puede cambiar (RN-10).
    entradas: Object.fromEntries(
      datos.items
        .filter((i) => camposDeItem(i).includes('consumo'))
        .map((i) => [i.id, { consumo: formatearNumero(datos.parametros.consumoDelAutoCada100Km.valor) }]),
    ),
    profesional: '',
  };
}

/**
 * Convierte lo que escribe una persona en Argentina a número: coma decimal y
 * punto de miles («1.234,5», «2.400.000»). Sin coma, un punto seguido de grupos
 * de tres cifras es de miles; si no, es decimal («1.5»). Vacío o inválido da
 * NaN, para que el motor lo rechace.
 */
export function leerNumero(texto: string | undefined): number {
  const limpio = (texto ?? '').replace(/\s|\$/g, '');
  if (limpio === '') return Number.NaN;
  const conMiles = limpio.includes(',') || /^-?\d{1,3}(\.\d{3})+$/.test(limpio);
  const normalizado = conMiles ? limpio.replace(/\./g, '').replace(',', '.') : limpio;
  return /^-?\d+(\.\d+)?$/.test(normalizado) ? Number(normalizado) : Number.NaN;
}

/**
 * Id del control de un campo del formulario, el mismo que usa el motor en
 * `Falta.campo`: así la lista de lo que falta lleva a cada uno.
 */
export const idDeCampo = (campo: string) => `campo-${campo}`;

/** Qué datos pide un ítem cuando se lo marca. */
export function camposDeItem(item: Item): Campo[] {
  if (item.tipo === 'por-trabajo') return ['monto'];
  if (item.tipo === 'calculado' && item.formula === 'amortizacion') return ['precio'];
  if (item.tipo === 'calculado' && item.formula === 'movilidad') return ['km', 'consumo'];
  return [];
}

export function aSeleccion(estado: EstadoDelFormulario, datos: Datos): Seleccion {
  const items: Seleccion['items'] = {};
  const elegidos = new Set(Object.values(estado.elegidos).filter((id): id is string => id !== null));

  for (const item of datos.items) {
    const marcado = item.exclusion ? elegidos.has(item.id) : estado.marcados[item.id];
    if (!marcado) continue;
    const entrada: EntradaDeItem = {};
    for (const campo of camposDeItem(item)) {
      const valor = leerNumero(estado.entradas[item.id]?.[campo]);
      // Un dato vacío no se manda: el motor avisa que falta (o usa su valor por defecto).
      if (!Number.isNaN(valor)) entrada[campo] = valor;
    }
    items[item.id] = entrada;
  }

  return {
    rolId: estado.rolId,
    provinciaId: estado.provinciaId,
    categoria: estado.categoria,
    horas: leerNumero(estado.horas),
    antiguedad: estado.antiguedad.trim() === '' ? 0 : leerNumero(estado.antiguedad),
    items,
  };
}

/** Valor hora del rol (RN-01), para mostrarlo antes de que haya un cálculo completo. */
export function valorHoraDelRol(rolId: string, datos: Datos): number {
  const rol = datos.roles.find((r) => r.id === rolId);
  return rol ? rol.valorBaseMensual / datos.parametros.horasMensuales.valor : 0;
}

/**
 * Cuánto vale un ítem, en una línea, para mostrarlo junto a su casilla. Los
 * calculados dependen de lo ya elegido (categoría, provincia, antigüedad): por
 * eso recibe el estado del formulario y no sólo el rol.
 */
export function resumenDelItem(item: Item, estado: EstadoDelFormulario, datos: Datos): string {
  const { rolId } = estado;
  switch (item.tipo) {
    case 'porcentual': {
      const porcentaje = item.porRol?.[rolId]?.porcentaje ?? item.porcentaje;
      return `${formatearPorcentaje(porcentaje)} del valor hora`;
    }
    case 'mensual': {
      const mensual = formatearPesos(valorMensual(item, rolId, datos));
      return item.multiplicaPor === 'antiguedad' ? `${mensual} por mes por año` : `${mensual} por mes`;
    }
    case 'por-jornada':
      return `${formatearPesosConCentavos(item.valor)} por jornada de ${datos.parametros.horasPorJornada.valor} h`;
    case 'por-trabajo':
      return 'Una vez por trabajo';
    case 'calculado':
      switch (item.formula) {
        case 'monotributo': {
          const c = datos.monotributo.categorias.find((x) => x.letra === estado.categoria);
          return c
            ? `${formatearPesos(c.impuestoIntegrado + c.sipa + c.obraSocial)} por mes en la categoría ${c.letra}`
            : 'Cuota de tu categoría, por mes';
        }
        case 'ingresos-brutos': {
          const p = datos.provincias.find((x) => x.id === estado.provinciaId);
          if (!p) return 'Según tu provincia';
          const iibb = p.ingresosBrutos;
          if (iibb.modo === 'alicuota') return `${p.nombre}: ${formatearPorcentaje(iibb.alicuota)} sobre el total facturado`;
          const fijo = iibb.montos[estado.categoria];
          return fijo === undefined
            ? `${p.nombre}: monto fijo por categoría`
            : `${p.nombre}: ${formatearPesos(fijo)} por mes en la categoría ${estado.categoria}`;
        }
        case 'fondo-vacaciones': {
          const anios = leerNumero(estado.antiguedad);
          const dias = diasDeVacaciones(Number.isNaN(anios) ? 0 : anios, datos);
          return `${dias} días de vacaciones al año, según tu antigüedad`;
        }
        case 'fondo-sac':
          return 'Un sueldo por año, repartido por mes';
        case 'amortizacion':
          return `Precio del equipo en ${datos.parametros.vidaUtilDeEquiposEnMeses.valor} meses`;
        case 'movilidad': {
          const nafta = datos.combustible.precios[estado.provinciaId];
          return nafta ? `Nafta súper a ${formatearPesos(nafta.precio)} el litro` : 'Nafta para los kilómetros del trabajo';
        }
      }
  }
}

/** Lo que un ítem marcado suma a este trabajo, según el último cálculo. */
export interface Aporte {
  monto: number;
  /** Suma cero porque falta un dato, no porque valga cero. */
  falta?: boolean;
}

/**
 * Lo que dice un subgrupo plegado (RF-27): cuántos ítems tiene marcados, cuánto
 * suman a este trabajo si hay un cálculo, y cuántos esperan un dato.
 */
export function cuentaDelSubgrupo(
  items: Item[],
  marcados: Record<string, boolean>,
  aportes: ReadonlyMap<string, Aporte>,
): string {
  const elegidos = items.filter((i) => marcados[i.id]);
  if (elegidos.length === 0) return 'Ninguno marcado';
  const cantidad = elegidos.length === 1 ? '1 marcado' : `${elegidos.length} marcados`;
  const del = elegidos.map((i) => aportes.get(i.id));
  if (del.some((a) => a === undefined)) return cantidad;
  const suma = del.reduce((total, a) => total + a!.monto, 0);
  const sinCompletar = del.filter((a) => a!.falta).length;
  return `${cantidad} · ${formatearPesos(suma)}${sinCompletar > 0 ? ` · ${sinCompletar} sin completar` : ''}`;
}

const meses = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/** «2026-10» → «octubre de 2026». */
export function formatearVigencia(vigencia: string): string {
  const [anio, mes] = vigencia.split('-').map(Number);
  return `${meses[mes - 1]} de ${anio}`;
}

/** «2026-10-13» → «13 de octubre de 2026». */
export function formatearFecha(fecha: string): string {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  return `${dia} de ${meses[mes - 1]} de ${anio}`;
}

/** La vigencia más reciente de todos los datos, AAAA-MM: «valores a octubre de 2026». */
export function vigenciaDeLosDatos(datos: Datos): string {
  const vigencias = [
    ...datos.roles.map((r) => r.vigencia),
    ...datos.items.map((i) => i.vigencia),
    ...datos.monotributo.categorias.map((c) => c.vigencia),
    ...datos.provincias.map((p) => p.ingresosBrutos.vigencia),
    datos.parametros.dolarOficial.fecha.slice(0, 7),
    ...Object.values(datos.combustible.precios).map((p) => p.fecha.slice(0, 7)),
  ];
  return vigencias.sort().at(-1)!;
}
