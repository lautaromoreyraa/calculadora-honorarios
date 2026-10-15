// Qué dice el presupuesto (RF-16), sin decir cómo se dibuja. De acá salen el
// Word y la vista previa de la pantalla: como los dos leen lo mismo, la vista
// previa no puede mostrar algo distinto de lo que se descarga. No importa docx,
// para que la vista previa no lo arrastre al bundle principal.
import type { Resultado } from '../calculo/tipos.ts';
import type { Datos } from '../datos/tipos.ts';
import { formatearNumero, formatearPesos } from '../formato.ts';
import { formatoDe } from '../moneda.ts';
import { textoDeValidez } from './fechas.ts';

/** Lo que el profesional completa antes de descargar. */
export interface DatosDelPresupuesto {
  numero: string;
  profesional: string;
  /** Contacto del profesional: los tres son opcionales y el vacío no sale. */
  email: string;
  telefono: string;
  cuit: string;
  /** Empresa u organización del cliente. */
  empresa: string;
  /** Persona del cliente a la que va dirigido; opcional. */
  contacto: string;
  descripcion: string;
  /** Hasta cuándo vale la oferta, AAAA-MM-DD como lo da el calendario. */
  validez: string;
  condiciones: string;
  /** Fecha del presupuesto; por defecto, hoy. */
  fecha?: Date;
}

/** Lo que falta y es necesario sale como marcador, para que se vea qué completar. */
export const MARCADORES = {
  numero: '[Número]',
  profesional: '[Nombre del profesional]',
  empresa: '[Cliente]',
  descripcion: '[Descripción del trabajo]',
  validez: '[Validez de la oferta]',
  condiciones: '[Condiciones de pago]',
} as const;

/** Un punto de partida que el profesional cambia a su gusto; se recuerda el suyo. */
export const CONDICIONES_POR_DEFECTO =
  '50 % de anticipo al aprobar el presupuesto y 50 % contra entrega, por transferencia bancaria. ' +
  'El plazo de entrega corre desde la aprobación y el pago del anticipo.';

/** El monotributista emite factura C, que no discrimina IVA: decirlo evita la pregunta de siempre. */
export const LEYENDA_FACTURA_C = 'Factura C: el IVA no se discrimina.';

export interface ContenidoDelPresupuesto {
  numero: string;
  fecha: string;
  profesional: { nombre: string; rol: string; contacto: string[] };
  cliente: { empresa: string; contacto?: string };
  trabajo: { descripcion: string; horas: string; valorHora: string };
  total: string;
  /** En dólares, a qué cotización se tomó (RF-28). */
  cotizacion?: string;
  /** Párrafos de las condiciones de pago, con la factura C si corresponde. */
  condiciones: string[];
  validez: string;
  vigencia: string;
}

const completar = (valor: string, marcador: string) => valor.trim() || marcador;

const fechaLarga = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
const mesLargo = new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric', timeZone: 'UTC' });

/** El mes más reciente entre las vigencias de los valores, como «octubre de 2026». */
export function vigenciaDeLosValores(datos: Datos): string {
  const vigencias = [
    ...datos.roles.map((r) => r.vigencia),
    ...datos.items.map((i) => i.vigencia),
    ...datos.monotributo.categorias.map((c) => c.vigencia),
    ...datos.provincias.map((p) => p.ingresosBrutos.vigencia),
  ].sort();
  const [anio, mes] = vigencias.at(-1)!.split('-').map(Number);
  return mesLargo.format(new Date(Date.UTC(anio, mes - 1, 1)));
}

/**
 * El número que se propone después de `ultimo`. «2026-007» → «2026-008»; al
 * cambiar de año vuelve a «2027-001». Si el profesional usa su propia forma
 * («P-17»), se respeta y se le suma uno al número del final.
 */
export function siguienteNumero(ultimo: string | null, anio: number): string {
  const primero = `${anio}-001`;
  const texto = ultimo?.trim() ?? '';
  const conAnio = /^(\d{4})-(\d+)$/.exec(texto);
  if (conAnio && Number(conAnio[1]) !== anio) return primero;
  const final = /^(.*?)(\d+)$/.exec(texto);
  if (!final) return primero;
  const [, prefijo, cifras] = final;
  return prefijo + String(Number(cifras) + 1).padStart(cifras.length, '0');
}

/** Todo lo que dice el presupuesto, ya escrito. Pura. */
export function contenidoDelPresupuesto(
  resultado: Resultado,
  datos: Datos,
  p: DatosDelPresupuesto,
): ContenidoDelPresupuesto {
  const formato = formatoDe(resultado);
  const contacto = [
    p.email.trim(),
    p.telefono.trim() && `Tel. ${p.telefono.trim()}`,
    p.cuit.trim() && `CUIT ${p.cuit.trim()}`,
  ].filter(Boolean);
  const condiciones = completar(p.condiciones, MARCADORES.condiciones)
    .split(/\n+/)
    .map((c) => c.trim())
    .filter(Boolean);
  if (resultado.renglones.some((r) => r.id === 'monotributo')) condiciones.push(LEYENDA_FACTURA_C);

  return {
    numero: completar(p.numero, MARCADORES.numero),
    fecha: fechaLarga.format(p.fecha ?? new Date()),
    profesional: { nombre: completar(p.profesional, MARCADORES.profesional), rol: resultado.rol.nombre, contacto },
    cliente: { empresa: completar(p.empresa, MARCADORES.empresa), contacto: p.contacto.trim() || undefined },
    trabajo: {
      descripcion: completar(p.descripcion, MARCADORES.descripcion),
      horas: `${formatearNumero(resultado.horas)} h`,
      // El precio final por hora, con todo adentro: es lo que el cliente compara.
      valorHora: formato.montoConCentavos(resultado.total / resultado.horas),
    },
    total: formato.monto(resultado.total),
    cotizacion: resultado.cotizacion
      ? `Montos en dólares al dólar blue de ${formatearPesos(resultado.cotizacion.valor)} del ${fechaLarga.format(
          new Date(`${resultado.cotizacion.fecha}T12:00:00`),
        )}.`
      : undefined,
    condiciones,
    validez: completar(textoDeValidez(p.validez), MARCADORES.validez),
    vigencia: `Valores de referencia vigentes a ${vigenciaDeLosValores(datos)}.`,
  };
}
