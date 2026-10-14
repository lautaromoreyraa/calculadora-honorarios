// Presupuesto en Word (RF-16). Arma un .docx editable con el resultado del motor
// para que el profesional lo retoque y se lo mande a su cliente. Va sin marca
// del proyecto: el documento es del profesional. Este módulo importa docx, que
// es pesado; la interfaz lo carga con import() recién al pedir la descarga.
import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import type { Datos } from '../datos/tipos.ts';
import type { Renglon, Resultado } from '../calculo/tipos.ts';
import { formatearNumero, formatearPesos } from '../formato.ts';

/** Lo que el profesional completa antes de descargar. Lo vacío sale como marcador. */
export interface DatosDelPresupuesto {
  profesional: string;
  cliente: string;
  descripcion: string;
  validez: string;
  /** Fecha del presupuesto; por defecto, hoy. */
  fecha?: Date;
}

export const MARCADORES = {
  profesional: '[Nombre del profesional]',
  cliente: '[Cliente]',
  descripcion: '[Descripción del trabajo]',
  validez: '[Validez de la oferta]',
} as const;

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

/** presupuesto-productor-2026-10-13.docx */
export function nombreDelArchivo(resultado: Resultado, fecha: Date = new Date()): string {
  const dia = [fecha.getFullYear(), fecha.getMonth() + 1, fecha.getDate()]
    .map((n) => String(n).padStart(2, '0'))
    .join('-');
  return `presupuesto-${resultado.rol.id}-${dia}.docx`;
}

const SIN_BORDE = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const LINEA = { style: BorderStyle.SINGLE, size: 4, color: 'BFBFBF' };

function celda(texto: string, opciones: { negrita?: boolean; derecha?: boolean; ancho: number }) {
  return new TableCell({
    width: { size: opciones.ancho, type: WidthType.PERCENTAGE },
    margins: { top: 60, bottom: 60, left: 80, right: 80 },
    borders: { top: SIN_BORDE, left: SIN_BORDE, right: SIN_BORDE, bottom: LINEA },
    children: [
      new Paragraph({
        alignment: opciones.derecha ? AlignmentType.RIGHT : AlignmentType.LEFT,
        children: [new TextRun({ text: texto, bold: opciones.negrita })],
      }),
    ],
  });
}

const fila = (concepto: string, detalle: string, monto: string, negrita = false) =>
  new TableRow({
    children: [
      celda(concepto, { negrita, ancho: 32 }),
      celda(detalle, { negrita, ancho: 48 }),
      celda(monto, { negrita, derecha: true, ancho: 20 }),
    ],
  });

const filaDeRenglon = (r: Renglon) => fila(r.concepto, r.detalle, formatearPesos(r.monto));

const campo = (etiqueta: string, valor: string) =>
  new Paragraph({ children: [new TextRun({ text: `${etiqueta}: `, bold: true }), new TextRun(valor)] });

/** Arma el documento. Pura: no toca el navegador ni la red. */
export function armarPresupuesto(resultado: Resultado, datos: Datos, presupuesto: DatosDelPresupuesto): Document {
  const filas = [
    new TableRow({
      tableHeader: true,
      children: [
        celda('Concepto', { negrita: true, ancho: 32 }),
        celda('Cómo se calcula', { negrita: true, ancho: 48 }),
        celda('Monto', { negrita: true, derecha: true, ancho: 20 }),
      ],
    }),
    ...resultado.renglones.map(filaDeRenglon),
  ];
  if (resultado.ingresosBrutosSobreTotal) {
    filas.push(fila('Subtotal', '', formatearPesos(resultado.subtotal), true));
    filas.push(filaDeRenglon(resultado.ingresosBrutosSobreTotal));
  }
  filas.push(fila('Total', '', formatearPesos(resultado.total), true));

  return new Document({
    creator: completar(presupuesto.profesional, ''),
    title: 'Presupuesto',
    styles: {
      default: { document: { run: { font: 'Calibri', size: 22 } } },
    },
    sections: [
      {
        children: [
          new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun('Presupuesto')] }),
          campo('Profesional', `${completar(presupuesto.profesional, MARCADORES.profesional)} · ${resultado.rol.nombre}`),
          campo('Cliente', completar(presupuesto.cliente, MARCADORES.cliente)),
          campo('Fecha', fechaLarga.format(presupuesto.fecha ?? new Date())),
          new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('Trabajo')] }),
          new Paragraph(completar(presupuesto.descripcion, MARCADORES.descripcion)),
          campo('Horas estimadas', `${formatearNumero(resultado.horas)} h`),
          new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('Detalle')] }),
          new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: filas }),
          new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('Condiciones')] }),
          campo('Validez de la oferta', completar(presupuesto.validez, MARCADORES.validez)),
          new Paragraph(`Valores de referencia vigentes a ${vigenciaDeLosValores(datos)}.`),
        ],
      },
    ],
  });
}

/** El .docx listo para descargar. */
export function generarPresupuesto(
  resultado: Resultado,
  datos: Datos,
  presupuesto: DatosDelPresupuesto,
): Promise<Blob> {
  return Packer.toBlob(armarPresupuesto(resultado, datos, presupuesto));
}
