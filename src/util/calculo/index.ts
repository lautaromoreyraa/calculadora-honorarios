// Motor de cálculo: aplica las reglas de negocio del SRS (RN-01 a RN-15) a lo
// que eligió el profesional. Funciones puras, sin React: todo lo que entra son
// datos y una selección, y lo que sale es el desglose.
import type { Datos, Dolares, Item, ItemCalculado, ItemMensual, ItemPorJornada, Rol } from '../datos/tipos.ts';
import { formatearNumero, formatearPorcentaje } from '../formato.ts';
import { EN_PESOS, type Formato } from '../moneda.ts';
import type { Calculo, Falta, Renglon, Seleccion } from './tipos.ts';
import { factorDesde } from '../indices.ts';
import { proyectarDesdeEscala, textoDeLaProyeccion } from '../proyeccion.ts';
import { ingresosBrutosDelNea, naftaDelNea } from '../nea.ts';

export type * from './tipos.ts';

/** Un renglón que suma cero porque falta un dato: la pantalla lo dice en vez de mostrar «$ 0». */
const faltante = (r: Renglon): Renglon => ({ ...r, falta: true });

/** Renglón ya redondeado a pesos (RN-11). */
const renglonEn = (formato: Formato, item: Pick<Item, 'id' | 'nombre'>, pesos: number, detalle: string): Renglon => ({
  id: item.id,
  concepto: item.nombre,
  detalle,
  monto: formato.redondear(pesos / formato.factor),
});

/**
 * Nombre del renglón. Una opción de un conjunto obligatorio («D · Empresas
 * privadas») no se entiende sola en el desglose ni en el Word: lleva adelante
 * el nombre del conjunto («Tipo de cliente: D · Empresas privadas»).
 */
function conceptoDe(item: Item, datos: Datos): string {
  const exclusion = datos.exclusiones.find((e) => e.id === item.exclusion);
  return exclusion?.obligatorio ? `${exclusion.nombre}: ${item.nombre}` : item.nombre;
}

const horasTexto =(h: number) => `${formatearNumero(h)} h`;

function pesosDeDolares(dolares: Dolares, cotizacion: number): number {
  const usd = dolares.herramientas.reduce((total, h) => total + h.precio, 0);
  return usd * dolares.proporcion * cotizacion;
}

/** Valor mensual de un ítem mensual para un rol, con su reemplazo por rol si lo hay. */
export function valorMensual(item: ItemMensual, rolId: string, datos: Datos): number {
  const propio = item.porRol?.[rolId];
  const dolares = propio?.dolares ?? (propio?.valor === undefined ? item.dolares : undefined);
  if (dolares) return pesosDeDolares(dolares, datos.parametros.dolarOficial.valor);
  return (propio?.valor ?? item.valor ?? 0) * factorDeActualizacion(item, datos, rolId);
}

/** Monto por jornada de un ítem, con su actualización (RN-12). */
export function valorPorJornada(item: ItemPorJornada, datos: Datos): number {
  return item.valor * factorDeActualizacion(item, datos);
}

/** El valor base mensual del rol proyectado desde su escala (RF-35), con la explicación. */
export function valorBaseDelRol(rol: Rol, datos: Datos): { valorBaseMensual: number; escala: string } {
  const proyeccion = proyectarDesdeEscala(rol.escala.origen, datos.indices);
  return {
    valorBaseMensual: rol.valorBaseMensual * proyeccion.factor,
    escala: textoDeLaProyeccion(proyeccion, rol.convenio),
  };
}

/**
 * Por cuánto se multiplica el monto cargado de un ítem (RN-12), siempre desde
 * su origen, nunca encadenando meses:
 * - un costo indexado (RF-20), por lo que se movió su serie del IPC Noreste;
 * - un valor de convenio (RF-35), por la proyección desde su escala; si el rol
 *   tiene una escala propia (la antigüedad del productor), por la de él.
 * Los demás ítems no se tocan.
 */
export function factorDeActualizacion(item: Item, datos: Datos, rolId?: string): number {
  const { regla, origen, serie } = item.actualizacion;
  if (regla === 'escala') {
    const propia = item.tipo === 'mensual' && rolId ? item.porRol?.[rolId]?.escala : undefined;
    const desde = propia?.origen ?? origen;
    return desde ? proyectarDesdeEscala(desde, datos.indices).factor : 1;
  }
  if (regla !== 'ipc-nea' || !origen || !serie) return 1;
  return factorDesde(datos.indices.series[serie === 'general' ? 'ipc-nea-general' : 'ipc-nea-comunicacion'], origen);
}

/** Días de vacaciones de la LCT según la antigüedad (art. 150). */
export function diasDeVacaciones(antiguedad: number, datos: Datos): number {
  const tramos = datos.parametros.vacaciones.diasPorAntiguedad;
  return tramos.filter((t) => antiguedad >= t.desdeAnios).at(-1)?.dias ?? tramos[0].dias;
}

/** Jornadas de 6 horas, redondeando hacia arriba (RN-14). */
function jornadas(horas: number, datos: Datos): number {
  return Math.ceil(horas / datos.parametros.horasPorJornada.valor);
}

/**
 * Si algo de lo marcado usa la categoría de monotributo (RF-07): sólo el ítem
 * «Monotributo». Los ingresos brutos van sobre el total en todo el NEA (RF-43)
 * y no la necesitan. Quien no es monotributista no lo marca y no se le pide.
 */
export function necesitaCategoria(marcado: (itemId: string) => boolean, datos: Datos): boolean {
  return datos.items.some((i) => i.tipo === 'calculado' && marcado(i.id) && i.formula === 'monotributo');
}

function validar(seleccion: Seleccion, datos: Datos): Falta[] {
  const errores: Falta[] = [];
  const falta = (campo: string, mensaje: string) => errores.push({ campo, mensaje });
  if (!datos.roles.some((r) => r.id === seleccion.rolId)) falta('rol', 'Elegí un rol.');
  if (
    necesitaCategoria((id) => id in seleccion.items, datos) &&
    !datos.monotributo.categorias.some((c) => c.letra === seleccion.categoria)
  ) {
    falta('categoria', 'Elegí una categoría de monotributo.');
  }
  // Vacío todavía no es un error: es algo por cargar, y se dice así.
  if (Number.isNaN(seleccion.horas)) falta('horas', 'Cargá las horas del trabajo.');
  else if (!Number.isFinite(seleccion.horas) || seleccion.horas <= 0) {
    falta('horas', 'Las horas del trabajo tienen que ser más que cero.');
  }
  if (!Number.isFinite(seleccion.antiguedad) || seleccion.antiguedad < 0) {
    falta('antiguedad', 'La antigüedad no puede ser negativa.');
  }
  for (const exclusion of datos.exclusiones) {
    const marcados = datos.items.filter((i) => i.exclusion === exclusion.id && i.id in seleccion.items);
    if (marcados.length > 1) falta(exclusion.id, `${exclusion.nombre}: elegí una sola opción.`);
    if (exclusion.obligatorio && marcados.length === 0) falta(exclusion.id, `Elegí el ${exclusion.nombre.toLowerCase()}.`);
  }
  return errores;
}

/**
 * El desglose de lo elegido. Todo se calcula en pesos; `formato` decide en qué
 * moneda salen los montos y los textos del detalle (RF-28). Cada renglón se
 * redondea en esa moneda y el total es la suma de los renglones (RN-11), así la
 * suma de lo que se ve da el total que se ve, también en dólares.
 */
export function calcular(seleccion: Seleccion, datos: Datos, formato: Formato = EN_PESOS): Calculo {
  const renglon = (item: Pick<Item, 'id' | 'nombre'>, pesos: number, detalle: string) =>
    renglonEn(formato, item, pesos, detalle);
  const errores = validar(seleccion, datos);
  if (errores.length > 0) return { ok: false, errores };

  const rolCargado = datos.roles.find((r) => r.id === seleccion.rolId)!;
  // El valor de convenio llevado desde su escala hasta hoy (RF-35): de acá sale el valor hora.
  const { valorBaseMensual, escala } = valorBaseDelRol(rolCargado, datos);
  const rol = { ...rolCargado, valorBaseMensual };
  // Sólo está garantizada si algo la usa (validar): se lee dentro de esos casos.
  const categoria = datos.monotributo.categorias.find((c) => c.letra === seleccion.categoria);
  const { horas, antiguedad } = seleccion;
  const horasMensuales = datos.parametros.horasMensuales.valor;
  const valorHora = rol.valorBaseMensual / horasMensuales; // RN-01
  /** Costo mensual llevado a las horas del trabajo (RN-03). */
  const prorratear = (mensual: number) => (mensual / horasMensuales) * horas;
  const prorrateoTexto = (mensual: number) =>
    `${formato.desdePesos(mensual)} por mes ÷ ${horasMensuales} h × ${horasTexto(horas)}`;

  const avisos: string[] = [];
  const renglones: Renglon[] = [
    {
      id: 'honorario-base',
      concepto: 'Honorario base',
      detalle: `${formato.desdePesosConCentavos(valorHora)} por hora × ${horasTexto(horas)}`,
      monto: formato.redondear((valorHora * horas) / formato.factor),
    },
  ];
  let ingresosBrutosSobreTotal: number | undefined;

  const calculado = (item: ItemCalculado): Renglon | undefined => {
    const entrada = seleccion.items[item.id] ?? {};
    switch (item.formula) {
      case 'monotributo': {
        const { letra, impuestoIntegrado, sipa, obraSocial } = categoria!;
        const cuota = impuestoIntegrado + sipa + obraSocial; // RN-06
        return renglon(item, prorratear(cuota), `Categoría ${letra}: ${prorrateoTexto(cuota)}`);
      }
      case 'ingresos-brutos': {
        // RN-07, RF-43: la alícuota más alta del NEA, sobre el total; se aplica al final.
        const iibb = ingresosBrutosDelNea(datos);
        if (!iibb) {
          avisos.push(`${item.nombre}: no hay alícuota cargada en los datos.`);
          return faltante(renglon(item, 0, 'Falta la alícuota en los datos'));
        }
        ingresosBrutosSobreTotal = iibb.alicuota;
        return undefined;
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
          return faltante(renglon(item, 0, 'Falta el precio del equipo'));
        }
        const mensual = entrada.precio / vidaUtil;
        return renglon(
          item,
          prorratear(mensual),
          `${formato.desdePesos(entrada.precio)} en ${vidaUtil} meses: ${prorrateoTexto(mensual)}`,
        );
      }
      case 'movilidad': {
        const nafta = naftaDelNea(datos); // RN-10, RF-43: la más cara del NEA
        const consumo = entrada.consumo ?? datos.parametros.consumoDelAutoCada100Km.valor;
        if (!entrada.km || entrada.km <= 0) {
          avisos.push(`${item.nombre}: faltan los kilómetros.`);
          return faltante(renglon(item, 0, 'Faltan los kilómetros'));
        }
        if (!nafta) {
          avisos.push(`${item.nombre}: no hay precio de la nafta en los datos.`);
          return faltante(renglon(item, 0, 'Falta el precio de la nafta en los datos'));
        }
        const litros = (entrada.km * consumo) / 100;
        return renglon(
          item,
          litros * nafta.precio,
          `${formatearNumero(entrada.km)} km a ${formatearNumero(consumo)} l/100 km = ${formatearNumero(litros)} l × ${formato.desdePesos(nafta.precio)}`,
        );
      }
    }
  };

  for (const original of datos.items) {
    if (!(original.id in seleccion.items)) continue;
    const item = { ...original, nombre: conceptoDe(original, datos) };
    const entrada = seleccion.items[item.id];
    switch (item.tipo) {
      case 'porcentual': {
        const porcentaje = item.porRol?.[rol.id]?.porcentaje ?? item.porcentaje; // RN-02
        renglones.push(
          renglon(
            item,
            valorHora * porcentaje * horas,
            `${formatearPorcentaje(porcentaje)} de ${formato.desdePesosConCentavos(valorHora)} × ${horasTexto(horas)}`,
          ),
        );
        break;
      }
      case 'mensual': {
        let mensual = valorMensual(item, rol.id, datos);
        let prefijo = '';
        if (item.multiplicaPor === 'antiguedad') {
          // Marcado con 0 años suma cero: se avisa, porque el dato está en otro bloque.
          if (antiguedad === 0) avisos.push(`${item.nombre}: cargá tus años de antigüedad en «El trabajo».`);
          prefijo = `${formatearNumero(antiguedad)} años × ${formato.desdePesos(mensual)}: `;
          mensual *= antiguedad;
        }
        const r = renglon(item, prorratear(mensual), prefijo + prorrateoTexto(mensual));
        renglones.push(item.multiplicaPor === 'antiguedad' && antiguedad === 0 ? faltante(r) : r);
        break;
      }
      case 'por-jornada': {
        const n = jornadas(horas, datos);
        const porJornada = valorPorJornada(item, datos);
        renglones.push(
          renglon(item, porJornada * n, `${n} ${n === 1 ? 'jornada' : 'jornadas'} × ${formato.desdePesos(porJornada)}`),
        );
        break;
      }
      case 'por-trabajo': {
        if (!entrada.monto || entrada.monto <= 0) {
          avisos.push(`${item.nombre}: falta el monto.`);
          renglones.push(faltante(renglon(item, 0, 'Falta el monto')));
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
  const subtotal = formato.redondear(renglones.reduce((total, r) => total + r.monto, 0));
  let total = subtotal;
  let renglonDeIngresosBrutos: Renglon | undefined;
  if (ingresosBrutosSobreTotal !== undefined) {
    // RN-07, RF-43: el total se eleva para que, descontado el impuesto, quede el subtotal.
    // El subtotal ya está en la moneda que se muestra: no se vuelve a convertir.
    const bruto = formato.redondear(subtotal / (1 - ingresosBrutosSobreTotal));
    const item = datos.items.find((i) => i.id === 'ingresos-brutos')!;
    renglonDeIngresosBrutos = {
      ...renglon(
        item,
        0,
        `${formatearPorcentaje(ingresosBrutosSobreTotal)} sobre el total facturado`,
      ),
      monto: formato.redondear(bruto - subtotal),
    };
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
        escala,
      },
      valorHora: valorHora / formato.factor,
      horas,
      renglones,
      subtotal,
      ingresosBrutosSobreTotal: renglonDeIngresosBrutos,
      total,
      avisos,
      moneda: formato.moneda,
      cotizacion: formato.cotizacion,
    },
  };
}
