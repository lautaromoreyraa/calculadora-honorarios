// Recordatorios de los valores que no se actualizan solos (RF-24). Funciones
// puras: las usa el script de la Action mensual, que abre un issue por cada
// aviso del mes salvo que ya haya uno abierto con la misma etiqueta.
//
// - Febrero y agosto: monotributo (ARCA) y RS de Chaco (ATP), que cambian en
//   esos meses y se cargan a mano (RN-13).
// - Octubre: revisión anual opcional de las escalas de convenio (por si
//   alguien quiere reanclarlas, RN-12) y de los cuatro costos de mercado
//   indexados, para compararlos con los precios de lista.
import { factorDeActualizacion, valorBaseDelRol, valorMensual } from './calculo/index.ts';
import type { Datos, Item, ItemMensual } from './datos/tipos.ts';
import { formatearPesos } from './formato.ts';

export interface Aviso {
  /** Identifica el tipo de aviso: con un issue abierto con esta etiqueta, no se abre otro. */
  etiqueta: string;
  titulo: string;
  cuerpo: string;
}

const mesLargo = new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const nombreDelMes = (mes: string) => {
  const [anio, numero] = mes.split('-').map(Number);
  return mesLargo.format(new Date(Date.UTC(anio, numero - 1, 1)));
};

function avisoDeValoresManuales(mes: string, datos: Datos): Aviso {
  const chaco = datos.provincias.find((p) => p.id === 'chaco');
  const vigenciaMonotributo = datos.monotributo.categorias.map((c) => c.vigencia).sort().at(-1)!;
  const filas = [
    `| Monotributo (categorías, impuesto integrado, SIPA y obra social) | ${nombreDelMes(vigenciaMonotributo)} | ${datos.monotributo.fuente} |`,
  ];
  if (chaco) {
    filas.push(
      `| RS de Chaco (monto fijo por categoría) | ${nombreDelMes(chaco.ingresosBrutos.vigencia)} | ${chaco.ingresosBrutos.fuente ?? 'https://atp.chaco.gob.ar/'} |`,
    );
  }
  return {
    etiqueta: 'aviso-valores-manuales',
    titulo: `Revisar monotributo y RS de Chaco · ${nombreDelMes(mes)}`,
    cuerpo: [
      'ARCA actualiza el monotributo en febrero y agosto, y ATP Chaco suele seguirla con el Régimen Simplificado. Estos valores no se actualizan solos (RN-13): si cambiaron, se cargan por un PR que revisa una persona (RF-23).',
      '',
      '| Valor | Vigente desde | Dónde se publica |',
      '|---|---|---|',
      ...filas,
    ].join('\n'),
  };
}

function avisoDeRevisionAnual(mes: string, datos: Datos): Aviso {
  const escalas = datos.roles.map((rol) => {
    const { valorBaseMensual, escala } = valorBaseDelRol(rol, datos);
    return `| ${rol.nombre} | ${formatearPesos(rol.valorBaseMensual)} | ${nombreDelMes(rol.escala.origen)} | ${formatearPesos(valorBaseMensual)} | ${escala} |`;
  });
  const adicionales = datos.items
    .filter((i) => i.actualizacion.regla === 'escala' && 'valor' in i && i.valor !== undefined)
    .map((i) => {
      const cargado = (i as Item & { valor: number }).valor;
      return `| ${i.nombre} | ${formatearPesos(cargado)} | ${nombreDelMes(i.actualizacion.origen!)} | ${formatearPesos(cargado * factorDeActualizacion(i, datos))} |`;
    });
  const mercado = datos.items
    .filter((i): i is ItemMensual => i.actualizacion.regla === 'ipc-nea' && i.tipo === 'mensual')
    .map(
      (i) =>
        `| ${i.nombre} | ${formatearPesos(i.valor ?? 0)} | ${nombreDelMes(i.actualizacion.origen!)} | ${formatearPesos(valorMensual(i, '', datos))} |`,
    );
  return {
    etiqueta: 'aviso-revision-anual',
    titulo: `Revisión anual de escalas y costos de mercado · ${mes.slice(0, 4)}`,
    cuerpo: [
      'Revisión opcional. La calculadora se actualiza sola por índice (RN-12), pero el índice no se entera si un convenio firmó más o menos que el promedio, ni si cambiaron los planes de un servicio. Si algo se apartó, el valor y su mes de origen se cargan de nuevo por un PR que revisa Lautaro.',
      '',
      '### Escalas de convenio',
      '',
      '| Rol | Escala cargada | Mes de la escala | Valor actual | Proyección |',
      '|---|---:|---|---:|---|',
      ...escalas,
      '',
      '| Adicional de convenio | Escala cargada | Mes de la escala | Valor actual |',
      '|---|---:|---|---:|',
      ...adicionales,
      '',
      '### Costos de mercado indexados',
      '',
      'Comparar con el precio de lista de hoy.',
      '',
      '| Costo | Valor cargado | Mes de origen | Valor actual |',
      '|---|---:|---|---:|',
      ...mercado,
    ].join('\n'),
  };
}

/** Los avisos que corresponden a un mes AAAA-MM: ninguno fuera de febrero, agosto y octubre. */
export function avisosDelMes(mes: string, datos: Datos): Aviso[] {
  const numero = Number(mes.slice(5, 7));
  if (numero === 2 || numero === 8) return [avisoDeValoresManuales(mes, datos)];
  if (numero === 10) return [avisoDeRevisionAnual(mes, datos)];
  return [];
}

/** Los avisos que hay que abrir: los del mes sin un issue abierto con su etiqueta. */
export function avisosParaAbrir(avisos: Aviso[], etiquetasAbiertas: string[]): Aviso[] {
  const abiertas = new Set(etiquetasAbiertas);
  return avisos.filter((a) => !abiertas.has(a.etiqueta));
}
