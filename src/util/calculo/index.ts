// Motor de cálculo: aplica las reglas de negocio del SRS (RN-01 a RN-15) a lo
// que eligió el profesional. Funciones puras, sin React: todo lo que entra son
// datos y una selección, y lo que sale es el desglose.
import type { Datos, Dolares, Item, ItemCalculado, ItemMensual } from '../datos/tipos.ts';
import {
  formatearNumero,
  formatearPesos,
  formatearPesosConCentavos,
  formatearPorcentaje,
} from '../formato.ts';
import type { Calculo, Renglon, Seleccion } from './tipos.ts';

export type * from './tipos.ts';

/** Renglón ya redondeado a pesos (RN-11). */
const renglon = (item: Pick<Item, 'id' | 'nombre'>, monto: number, detalle: string): Renglon => ({
  id: item.id,
  concepto: item.nombre,
  detalle,
  monto: Math.round(monto),
});

const horasTexto = (h: number) => `${formatearNumero(h)} h`;

export function pesosDeDolares(dolares: Dolares, cotizacion: number): number {
  const usd = dolares.herramientas.reduce((total, h) => total + h.precio, 0);
  return usd * dolares.proporcion * cotizacion;
}

/** Valor mensual de un ítem mensual para un rol, con su reemplazo por rol si lo hay. */
export function valorMensual(item: ItemMensual, rolId: string, datos: Datos): number {
  const propio = item.porRol?.[rolId];
  const dolares = propio?.dolares ?? (propio?.valor === undefined ? item.dolares : undefined);
  if (dolares) return pesosDeDolares(dolares, datos.parametros.dolarOficial.valor);
  return propio?.valor ?? item.valor ?? 0;
}

/** Días de vacaciones de la LCT según la antigüedad (art. 150). */
export function diasDeVacaciones(antiguedad: number, datos: Datos): number {
  const tramos = datos.parametros.vacaciones.diasPorAntiguedad;
  return tramos.filter((t) => antiguedad >= t.desdeAnios).at(-1)?.dias ?? tramos[0].dias;
}

/** Jornadas de 6 horas, redondeando hacia arriba (RN-14). */
export function jornadas(horas: number, datos: Datos): number {
  return Math.ceil(horas / datos.parametros.horasPorJornada.valor);
}

function validar(seleccion: Seleccion, datos: Datos): string[] {
  const errores: string[] = [];
  if (!datos.roles.some((r) => r.id === seleccion.rolId)) errores.push('Elegí un rol.');
  if (!datos.provincias.some((p) => p.id === seleccion.provinciaId)) errores.push('Elegí una provincia.');
  if (!datos.monotributo.categorias.some((c) => c.letra === seleccion.categoria)) {
    errores.push('Elegí una categoría de monotributo.');
  }
  if (!Number.isFinite(seleccion.horas) || seleccion.horas <= 0) {
    errores.push('Las horas del trabajo tienen que ser más que cero.');
  }
  if (!Number.isFinite(seleccion.antiguedad) || seleccion.antiguedad < 0) {
    errores.push('La antigüedad no puede ser negativa.');
  }
  for (const exclusion of datos.exclusiones) {
    const marcados = datos.items.filter((i) => i.exclusion === exclusion.id && i.id in seleccion.items);
    if (marcados.length > 1) errores.push(`${exclusion.nombre}: elegí una sola opción.`);
    if (exclusion.obligatorio && marcados.length === 0) errores.push(`Elegí el ${exclusion.nombre.toLowerCase()}.`);
  }
  return errores;
}

export function calcular(seleccion: Seleccion, datos: Datos): Calculo {
  const errores = validar(seleccion, datos);
  if (errores.length > 0) return { ok: false, errores };

  const rol = datos.roles.find((r) => r.id === seleccion.rolId)!;
  const provincia = datos.provincias.find((p) => p.id === seleccion.provinciaId)!;
  const categoria = datos.monotributo.categorias.find((c) => c.letra === seleccion.categoria)!;
  const { horas, antiguedad } = seleccion;
  const horasMensuales = datos.parametros.horasMensuales.valor;
  const valorHora = rol.valorBaseMensual / horasMensuales; // RN-01
  /** Costo mensual llevado a las horas del trabajo (RN-03). */
  const prorratear = (mensual: number) => (mensual / horasMensuales) * horas;
  const prorrateoTexto = (mensual: number) =>
    `${formatearPesos(mensual)} por mes ÷ ${horasMensuales} h × ${horasTexto(horas)}`;

  const avisos: string[] = [];
  const renglones: Renglon[] = [
    {
      id: 'honorario-base',
      concepto: 'Honorario base',
      detalle: `${formatearPesosConCentavos(valorHora)} por hora × ${horasTexto(horas)}`,
      monto: Math.round(valorHora * horas),
    },
  ];
  let ingresosBrutosSobreTotal: number | undefined;

  const calculado = (item: ItemCalculado): Renglon | undefined => {
    const entrada = seleccion.items[item.id] ?? {};
    switch (item.formula) {
      case 'monotributo': {
        const cuota = categoria.impuestoIntegrado + categoria.sipa + categoria.obraSocial; // RN-06
        return renglon(item, prorratear(cuota), `Categoría ${categoria.letra}: ${prorrateoTexto(cuota)}`);
      }
      case 'ingresos-brutos': {
        const iibb = provincia.ingresosBrutos; // RN-07
        if (iibb.modo === 'alicuota') {
          ingresosBrutosSobreTotal = iibb.alicuota;
          return undefined;
        }
        const fijo = iibb.montos[categoria.letra] ?? 0;
        return renglon(
          item,
          prorratear(fijo),
          `${provincia.nombre}, categoría ${categoria.letra}: ${prorrateoTexto(fijo)}`,
        );
      }
      case 'fondo-vacaciones': {
        const { divisorDelDia } = datos.parametros.vacaciones; // RN-05
        const dias = diasDeVacaciones(antiguedad, datos);
        const mensual = (rol.valorBaseMensual / divisorDelDia) * dias / 12;
        return renglon(item, prorratear(mensual), `${dias} días al año: ${prorrateoTexto(mensual)}`);
      }
      case 'fondo-sac': {
        const mensual = (rol.valorBaseMensual * datos.parametros.sueldoAnualComplementario.sueldosPorAnio) / 12;
        return renglon(item, prorratear(mensual), prorrateoTexto(mensual));
      }
      case 'amortizacion': {
        const vidaUtil = datos.parametros.vidaUtilDeEquiposEnMeses.valor; // RN-08
        if (!entrada.precio || entrada.precio <= 0) {
          avisos.push(`${item.nombre}: falta el precio del equipo.`);
          return renglon(item, 0, 'Falta el precio del equipo');
        }
        const mensual = entrada.precio / vidaUtil;
        return renglon(
          item,
          prorratear(mensual),
          `${formatearPesos(entrada.precio)} en ${vidaUtil} meses: ${prorrateoTexto(mensual)}`,
        );
      }
      case 'movilidad': {
        const nafta = datos.combustible.precios[provincia.id]; // RN-10
        const consumo = entrada.consumo ?? datos.parametros.consumoDelAutoCada100Km.valor;
        if (!entrada.km || entrada.km <= 0) {
          avisos.push(`${item.nombre}: faltan los kilómetros.`);
          return renglon(item, 0, 'Faltan los kilómetros');
        }
        const litros = (entrada.km * consumo) / 100;
        return renglon(
          item,
          litros * nafta.precio,
          `${formatearNumero(entrada.km)} km a ${formatearNumero(consumo)} l/100 km = ${formatearNumero(litros)} l × ${formatearPesos(nafta.precio)}`,
        );
      }
    }
  };

  for (const item of datos.items) {
    if (!(item.id in seleccion.items)) continue;
    const entrada = seleccion.items[item.id];
    switch (item.tipo) {
      case 'porcentual': {
        const porcentaje = item.porRol?.[rol.id]?.porcentaje ?? item.porcentaje; // RN-02
        renglones.push(
          renglon(
            item,
            valorHora * porcentaje * horas,
            `${formatearPorcentaje(porcentaje)} de ${formatearPesosConCentavos(valorHora)} × ${horasTexto(horas)}`,
          ),
        );
        break;
      }
      case 'mensual': {
        let mensual = valorMensual(item, rol.id, datos);
        let prefijo = '';
        if (item.multiplicaPor === 'antiguedad') {
          prefijo = `${formatearNumero(antiguedad)} años × ${formatearPesos(mensual)}: `;
          mensual *= antiguedad;
        }
        renglones.push(renglon(item, prorratear(mensual), prefijo + prorrateoTexto(mensual)));
        break;
      }
      case 'por-jornada': {
        const n = jornadas(horas, datos);
        renglones.push(
          renglon(item, item.valor * n, `${n} ${n === 1 ? 'jornada' : 'jornadas'} × ${formatearPesos(item.valor)}`),
        );
        break;
      }
      case 'por-trabajo': {
        if (!entrada.monto || entrada.monto <= 0) {
          avisos.push(`${item.nombre}: falta el monto.`);
          renglones.push(renglon(item, 0, 'Falta el monto'));
        } else {
          renglones.push(renglon(item, entrada.monto, 'Una vez por trabajo'));
        }
        break;
      }
      case 'calculado': {
        const r = calculado(item);
        if (r) renglones.push(r);
        break;
      }
    }
  }

  // RN-11: el total es la suma de los renglones ya redondeados.
  const subtotal = renglones.reduce((total, r) => total + r.monto, 0);
  let total = subtotal;
  let renglonDeIngresosBrutos: Renglon | undefined;
  if (ingresosBrutosSobreTotal !== undefined) {
    // RN-07, Corrientes: el total se eleva para que, descontado el impuesto, quede el subtotal.
    const bruto = Math.round(subtotal / (1 - ingresosBrutosSobreTotal));
    const item = datos.items.find((i) => i.id === 'ingresos-brutos')!;
    renglonDeIngresosBrutos = renglon(
      item,
      bruto - subtotal,
      `${provincia.nombre}: ${formatearPorcentaje(ingresosBrutosSobreTotal)} sobre el total facturado`,
    );
    total = bruto;
  }

  return {
    ok: true,
    resultado: {
      rol: {
        id: rol.id,
        nombre: rol.nombre,
        convenio: rol.convenio,
        valorBaseMensual: rol.valorBaseMensual,
      },
      valorHora,
      horas,
      renglones,
      subtotal,
      ingresosBrutosSobreTotal: renglonDeIngresosBrutos,
      total,
      avisos,
    },
  };
}
