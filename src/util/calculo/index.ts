import type { Datos, Dolares, Item, ItemCalculado, ItemMensual, ItemPorJornada, Rol } from '../datos/tipos.ts';
import { formatearNumero, formatearPorcentaje } from '../formato.ts';
import { EN_PESOS, type Formato } from '../moneda.ts';
import type { Calculo, Falta, Renglon, Seleccion } from './tipos.ts';
import { factorDesde } from '../indices.ts';
import { proyectarDesdeEscala, textoDeLaProyeccion } from '../proyeccion.ts';
import { ingresosBrutosDelNea, naftaDelNea } from '../nea.ts';

export type * from './tipos.ts';

const faltante = (r: Renglon): Renglon => ({ ...r, falta: true });

const renglonEn = (formato: Formato, item: Pick<Item, 'id' | 'nombre'>, pesos: number, detalle: string): Renglon => ({
  id: item.id,
  concepto: item.nombre,
  detalle,
  monto: formato.redondear(pesos / formato.factor),
});

function conceptoDe(item: Item, datos: Datos): string {
  const exclusion = datos.exclusiones.find((e) => e.id === item.exclusion);
  return exclusion?.obligatorio ? `${exclusion.nombre}: ${item.nombre}` : item.nombre;
}

const horasTexto =(h: number) => `${formatearNumero(h)} h`;

function pesosDeDolares(dolares: Dolares, cotizacion: number): number {
  const usd = dolares.herramientas.reduce((total, h) => total + h.precio, 0);
  return usd * dolares.proporcion * cotizacion;
}

export function valorMensual(item: ItemMensual, rolId: string, datos: Datos): number {
  const propio = item.porRol?.[rolId];
  const dolares = propio?.dolares ?? (propio?.valor === undefined ? item.dolares : undefined);
  if (dolares) return pesosDeDolares(dolares, datos.parametros.dolarOficial.valor);
  return (propio?.valor ?? item.valor ?? 0) * factorDeActualizacion(item, datos, rolId);
}

export function valorPorJornada(item: ItemPorJornada, datos: Datos): number {
  return item.valor * factorDeActualizacion(item, datos);
}

export function valorBaseDelRol(rol: Rol, datos: Datos): { valorBaseMensual: number; escala: string } {
  const proyeccion = proyectarDesdeEscala(rol.escala.origen, datos.indices);
  return {
    valorBaseMensual: rol.valorBaseMensual * proyeccion.factor,
    escala: textoDeLaProyeccion(proyeccion, rol.convenio),
  };
}

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

export function diasDeVacaciones(antiguedad: number, datos: Datos): number {
  const tramos = datos.parametros.vacaciones.diasPorAntiguedad;
  return tramos.filter((t) => antiguedad >= t.desdeAnios).at(-1)?.dias ?? tramos[0].dias;
}

function jornadas(horas: number, datos: Datos): number {
  return Math.ceil(horas / datos.parametros.horasPorJornada.valor);
}

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

export function calcular(seleccion: Seleccion, datos: Datos, formato: Formato = EN_PESOS): Calculo {
  const renglon = (item: Pick<Item, 'id' | 'nombre'>, pesos: number, detalle: string) =>
    renglonEn(formato, item, pesos, detalle);
  const errores = validar(seleccion, datos);
  if (errores.length > 0) return { ok: false, errores };

  const rolCargado = datos.roles.find((r) => r.id === seleccion.rolId)!;
  const { valorBaseMensual, escala } = valorBaseDelRol(rolCargado, datos);
  const rol = { ...rolCargado, valorBaseMensual };
  const categoria = datos.monotributo.categorias.find((c) => c.letra === seleccion.categoria);
  const { horas, antiguedad } = seleccion;
  const horasMensuales = datos.parametros.horasMensuales.valor;
  const valorHora = rol.valorBaseMensual / horasMensuales;
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
        const cuota = impuestoIntegrado + sipa + obraSocial;
        return renglon(item, prorratear(cuota), `Categoría ${letra}: ${prorrateoTexto(cuota)}`);
      }
      case 'ingresos-brutos': {
        const iibb = ingresosBrutosDelNea(datos);
        if (!iibb) {
          avisos.push(`${item.nombre}: no hay alícuota cargada en los datos.`);
          return faltante(renglon(item, 0, 'Falta la alícuota en los datos'));
        }
        ingresosBrutosSobreTotal = iibb.alicuota;
        return undefined;
      }
      case 'fondo-vacaciones': {
        const { divisorDelDia } = datos.parametros.vacaciones;
        const dias = diasDeVacaciones(antiguedad, datos);
        const mensual = (rol.valorBaseMensual / divisorDelDia) * dias / 12;
        return renglon(item, prorratear(mensual), `${dias} días al año: ${prorrateoTexto(mensual)}`);
      }
      case 'fondo-sac': {
        const mensual = (rol.valorBaseMensual * datos.parametros.sueldoAnualComplementario.sueldosPorAnio) / 12;
        return renglon(item, prorratear(mensual), prorrateoTexto(mensual));
      }
      case 'amortizacion': {
        const vidaUtil = datos.parametros.vidaUtilDeEquiposEnMeses.valor;
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
        if (seleccion.transportePrivado) {
          if (!entrada.monto || entrada.monto <= 0) {
            avisos.push(`${item.nombre}: falta el monto del viaje.`);
            return faltante(renglon(item, 0, 'Falta el monto del viaje'));
          }
          return renglon(item, entrada.monto, `Transporte privado: ${formato.desdePesos(entrada.monto)}`);
        }
        const nafta = naftaDelNea(datos);
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
        const porcentaje = item.porRol?.[rol.id]?.porcentaje ?? item.porcentaje;
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

  const subtotal = formato.redondear(renglones.reduce((total, r) => total + r.monto, 0));
  let total = subtotal;
  let renglonDeIngresosBrutos: Renglon | undefined;
  if (ingresosBrutosSobreTotal !== undefined) {
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
