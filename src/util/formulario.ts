import type { Datos, Item } from './datos/tipos.ts';
import type { Calculo, EntradaDeItem, Seleccion } from './calculo/tipos.ts';
import { diasDeVacaciones, valorBaseDelRol, valorMensual, valorPorJornada } from './calculo/index.ts';
import { formatearNumero, formatearPesos, formatearPesosConCentavos, formatearPorcentaje } from './formato.ts';
import { EN_PESOS, type Formato, type Moneda } from './moneda.ts';
import { CONDICIONES_POR_DEFECTO } from './presupuesto/contenido.ts';
import { ingresosBrutosDelNea, naftaDelNea } from './nea.ts';

export type Campo = keyof EntradaDeItem;

export type Vehiculo = 'auto' | 'moto' | 'privado';

export interface EstadoDelFormulario {
  rolId: string;
  categoria: string;
  horas: string;
  antiguedad: string;
  marcados: Record<string, boolean>;
  elegidos: Record<string, string | null>;
  entradas: Record<string, Partial<Record<Campo, string>>>;
  profesional: string;
  email: string;
  telefono: string;
  cuit: string;
  condiciones: string;
  vehiculo: Vehiculo;
  moneda: Moneda;
}

export function estadoInicial(datos: Datos): EstadoDelFormulario {
  return {
    rolId: datos.roles[0].id,
    categoria: datos.monotributo.categorias[0].letra,
    horas: '',
    antiguedad: '0',
    marcados: {},
    elegidos: Object.fromEntries(datos.exclusiones.map((e) => [e.id, null])),
    entradas: Object.fromEntries(
      datos.items
        .filter((i) => camposDeItem(i).includes('consumo'))
        .map((i) => [i.id, { consumo: formatearNumero(datos.parametros.consumoDelAutoCada100Km.valor) }]),
    ),
    profesional: '',
    email: '',
    telefono: '',
    cuit: '',
    condiciones: CONDICIONES_POR_DEFECTO,
    vehiculo: 'auto',
    moneda: 'ARS',
  };
}

function consumoDe(vehiculo: Vehiculo, datos: Datos): number {
  const { consumoDelAutoCada100Km, consumoDeLaMotoCada100Km } = datos.parametros;
  return (vehiculo === 'moto' ? consumoDeLaMotoCada100Km : consumoDelAutoCada100Km).valor;
}

export function conVehiculo(estado: EstadoDelFormulario, vehiculo: Vehiculo, datos: Datos): EstadoDelFormulario {
  if (vehiculo === 'privado') return { ...estado, vehiculo };
  const consumo = formatearNumero(consumoDe(vehiculo, datos));
  const entradas = { ...estado.entradas };
  for (const item of datos.items.filter((i) => camposDeItem(i).includes('consumo'))) {
    entradas[item.id] = { ...entradas[item.id], consumo };
  }
  return { ...estado, vehiculo, entradas };
}

function tieneAntiguedad(texto: string): boolean {
  const n = texto.trim() === '' ? 0 : leerNumero(texto);
  return Number.isFinite(n) && n > 0;
}

export function vaPorAntiguedad(item: Item): boolean {
  return item.tipo === 'mensual' && item.multiplicaPor === 'antiguedad' && !item.exclusion;
}

export function leerNumero(texto: string | undefined): number {
  const limpio = (texto ?? '').replace(/\s|\$/g, '');
  if (limpio === '') return Number.NaN;
  const conMiles = limpio.includes(',') || /^-?\d{1,3}(\.\d{3})+$/.test(limpio);
  const normalizado = conMiles ? limpio.replace(/\./g, '').replace(',', '.') : limpio;
  return /^-?\d+(\.\d+)?$/.test(normalizado) ? Number(normalizado) : Number.NaN;
}

export const idDeCampo = (campo: string) => `campo-${campo}`;

export function esMovilidad(item: Item): boolean {
  return item.tipo === 'calculado' && item.formula === 'movilidad';
}

export function camposDeItem(item: Item, vehiculo: Vehiculo = 'auto'): Campo[] {
  if (item.tipo === 'por-trabajo') return ['monto'];
  if (item.tipo === 'calculado' && item.formula === 'amortizacion') return ['precio'];
  if (esMovilidad(item)) return vehiculo === 'privado' ? ['monto'] : ['km', 'consumo'];
  return [];
}

export function aSeleccion(estado: EstadoDelFormulario, datos: Datos): Seleccion {
  const items: Seleccion['items'] = {};
  const elegidos = new Set(Object.values(estado.elegidos).filter((id): id is string => id !== null));

  for (const item of datos.items) {
    const marcado = item.exclusion
      ? elegidos.has(item.id)
      : vaPorAntiguedad(item)
        ? tieneAntiguedad(estado.antiguedad)
        : estado.marcados[item.id];
    if (!marcado) continue;
    const entrada: EntradaDeItem = {};
    for (const campo of camposDeItem(item, estado.vehiculo)) {
      const valor = leerNumero(estado.entradas[item.id]?.[campo]);
      if (!Number.isNaN(valor)) entrada[campo] = valor;
    }
    items[item.id] = entrada;
  }

  return {
    rolId: estado.rolId,
    ...(estado.vehiculo === 'privado' ? { transportePrivado: true } : {}),
    categoria: estado.categoria,
    horas: leerNumero(estado.horas),
    antiguedad: estado.antiguedad.trim() === '' ? 0 : leerNumero(estado.antiguedad),
    items,
  };
}

export function valorHoraDelRol(rolId: string, datos: Datos): number {
  const rol = datos.roles.find((r) => r.id === rolId);
  return rol ? valorBaseDelRol(rol, datos).valorBaseMensual / datos.parametros.horasMensuales.valor : 0;
}

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
      return `${formatearPesosConCentavos(valorPorJornada(item, datos))} por jornada de ${datos.parametros.horasPorJornada.valor} h`;
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
          const iibb = ingresosBrutosDelNea(datos);
          return iibb ? `${formatearPorcentaje(iibb.alicuota)} sobre el total facturado` : 'Sobre el total facturado';
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
          if (estado.vehiculo === 'privado') return 'Lo que salió el viaje en Uber, remis o taxi';
          const nafta = naftaDelNea(datos);
          return nafta ? `Nafta súper a ${formatearPesos(nafta.precio)} el litro` : 'Nafta para los kilómetros del trabajo';
        }
      }
  }
}

export interface Aporte {
  monto: number;
  falta?: boolean;
}

const cuantosItems = (n: number) => (n === 1 ? '1 ítem' : `${n} ítems`);

export function datosQueFaltan(calculo: Calculo): number {
  return calculo.ok ? calculo.resultado.avisos.length : calculo.errores.length;
}

export function textoDeLoQueFalta(cantidad: number): string {
  return cantidad === 1 ? 'Falta 1 dato' : `Faltan ${cantidad} datos`;
}

export function cuentaDelSubgrupo(
  items: Item[],
  marcados: Record<string, boolean>,
  aportes: ReadonlyMap<string, Aporte>,
  formato: Formato = EN_PESOS,
): string {
  const total = cuantosItems(items.length);
  const elegidos = items.filter((i) => marcados[i.id]);
  if (elegidos.length === 0) return `${total} · ninguno marcado`;
  const cantidad = elegidos.length === 1 ? '1 marcado' : `${elegidos.length} marcados`;
  const del = elegidos.map((i) => aportes.get(i.id));
  if (del.some((a) => a === undefined)) return `${total} · ${cantidad}`;
  const suma = del.reduce((t, a) => t + a!.monto, 0);
  const sinCompletar = del.filter((a) => a!.falta).length;
  return `${total} · ${cantidad} · ${formato.monto(formato.redondear(suma))}${sinCompletar > 0 ? ` · ${sinCompletar} sin completar` : ''}`;
}

export function resumenDeSubgrupos(items: number, subgrupos: number): string {
  const grupos = subgrupos === 1 ? '1 grupo' : `${subgrupos} grupos`;
  return `${cuantosItems(items)} en ${grupos}: revisalos todos`;
}

const meses = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

export function formatearVigencia(vigencia: string): string {
  const [anio, mes] = vigencia.split('-').map(Number);
  return `${meses[mes - 1]} de ${anio}`;
}

export function formatearFecha(fecha: string): string {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  return `${dia} de ${meses[mes - 1]} de ${anio}`;
}

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
