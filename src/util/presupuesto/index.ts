// Presupuesto en Word (RF-16). Arma un .docx editable con el resultado del motor
// para que el profesional lo retoque y se lo mande a su cliente. Va sin marca
// del proyecto: el documento es del profesional. Lleva el trabajo y el total,
// no el desglose: lo que le cuesta al profesional trabajar por su cuenta
// (contador, fondos, impuestos) es suyo, no del cliente. Qué dice sale de
// contenido.ts, lo mismo que la vista previa; acá sólo se dibuja. Este módulo
// importa docx, que es pesado; la interfaz lo carga con import() recién al
// pedir la descarga.
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
import type { Resultado } from '../calculo/tipos.ts';
import { contenidoDelPresupuesto, type DatosDelPresupuesto } from './contenido.ts';

export {
  CONDICIONES_POR_DEFECTO,
  MARCADORES,
  siguienteNumero,
  vigenciaDeLosValores,
  type DatosDelPresupuesto,
} from './contenido.ts';

/** presupuesto-productor-2026-10-13.docx */
export function nombreDelArchivo(resultado: Resultado, fecha: Date = new Date()): string {
  const dia = [fecha.getFullYear(), fecha.getMonth() + 1, fecha.getDate()]
    .map((n) => String(n).padStart(2, '0'))
    .join('-');
  return `presupuesto-${resultado.rol.id}-${dia}.docx`;
}

// Cambria viene con Office y LibreOffice la reemplaza por Caladea, de la misma
// métrica: una serifa como la de los títulos del sitio. El petróleo es el de la
// franja del encabezado (RNF-10), así el documento se reconoce sin llevar marca.
const FUENTE_DE_TITULOS = 'Cambria';
const PETROLEO = '0C5952';
const GRIS = '595959';
const LINEA = { style: BorderStyle.SINGLE, size: 6, color: 'BFBFBF', space: 6 };
const SIN_BORDE = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const SIN_BORDES = { top: SIN_BORDE, bottom: SIN_BORDE, left: SIN_BORDE, right: SIN_BORDE };
const BORDE_DE_TABLA = { style: BorderStyle.SINGLE, size: 4, color: 'BFBFBF' };

const campo = (etiqueta: string, valor: string) =>
  new Paragraph({ children: [new TextRun({ text: `${etiqueta}: `, bold: true }), new TextRun(valor)] });

const rotulo = (texto: string) =>
  new Paragraph({
    spacing: { after: 60 },
    children: [new TextRun({ text: texto.toUpperCase(), bold: true, size: 18, color: PETROLEO })],
  });

const linea = (texto: string, opciones: { negrita?: boolean; gris?: boolean } = {}) =>
  new Paragraph({ children: [new TextRun({ text: texto, bold: opciones.negrita, color: opciones.gris ? GRIS : undefined })] });

/** Una columna de «De» o «Para», sin bordes: se lee como membrete, no como planilla. */
const columna = (hijos: Paragraph[]) =>
  new TableCell({ borders: SIN_BORDES, width: { size: 50, type: WidthType.PERCENTAGE }, children: hijos });

const celda = (texto: string, opciones: { encabezado?: boolean; derecha?: boolean; ancho: number }) =>
  new TableCell({
    width: { size: opciones.ancho, type: WidthType.PERCENTAGE },
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    shading: opciones.encabezado ? { fill: 'EAF2F1' } : undefined,
    children: [
      new Paragraph({
        alignment: opciones.derecha ? AlignmentType.RIGHT : AlignmentType.LEFT,
        children: [new TextRun({ text: texto, bold: opciones.encabezado, color: opciones.encabezado ? PETROLEO : undefined })],
      }),
    ],
  });

/** Arma el documento. Pura: no toca el navegador ni la red. */
export function armarPresupuesto(resultado: Resultado, datos: Datos, presupuesto: DatosDelPresupuesto): Document {
  const c = contenidoDelPresupuesto(resultado, datos, presupuesto);
  const anchos = [58, 14, 28];
  return new Document({
    creator: presupuesto.profesional.trim(),
    title: `Presupuesto ${c.numero}`,
    styles: {
      default: {
        document: { run: { font: 'Calibri', size: 22 } },
        title: { run: { font: FUENTE_DE_TITULOS, size: 52, color: PETROLEO } },
        heading1: {
          run: { font: FUENTE_DE_TITULOS, size: 30, color: PETROLEO },
          paragraph: { spacing: { before: 360, after: 120 } },
        },
      },
    },
    sections: [
      {
        children: [
          new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun('Presupuesto')] }),
          new Paragraph({
            spacing: { after: 240 },
            children: [new TextRun({ text: `N.º ${c.numero} · ${c.fecha}`, color: GRIS })],
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: { ...SIN_BORDES, insideHorizontal: SIN_BORDE, insideVertical: SIN_BORDE },
            rows: [
              new TableRow({
                children: [
                  columna([
                    rotulo('De'),
                    linea(c.profesional.nombre, { negrita: true }),
                    linea(c.profesional.rol),
                    ...c.profesional.contacto.map((x) => linea(x, { gris: true })),
                  ]),
                  columna([
                    rotulo('Para'),
                    linea(c.cliente.empresa, { negrita: true }),
                    ...(c.cliente.contacto ? [linea(c.cliente.contacto)] : []),
                  ]),
                ],
              }),
            ],
          }),
          new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('Trabajo')] }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: BORDE_DE_TABLA,
              bottom: BORDE_DE_TABLA,
              left: BORDE_DE_TABLA,
              right: BORDE_DE_TABLA,
              insideHorizontal: BORDE_DE_TABLA,
              insideVertical: BORDE_DE_TABLA,
            },
            rows: [
              new TableRow({
                tableHeader: true,
                children: [
                  celda('Descripción', { encabezado: true, ancho: anchos[0] }),
                  celda('Horas', { encabezado: true, derecha: true, ancho: anchos[1] }),
                  celda('Valor por hora', { encabezado: true, derecha: true, ancho: anchos[2] }),
                ],
              }),
              new TableRow({
                children: [
                  celda(c.trabajo.descripcion, { ancho: anchos[0] }),
                  celda(c.trabajo.horas, { derecha: true, ancho: anchos[1] }),
                  celda(c.trabajo.valorHora, { derecha: true, ancho: anchos[2] }),
                ],
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { before: 240, after: 120 },
            border: { top: LINEA, bottom: LINEA },
            children: [
              new TextRun({ text: 'Total del trabajo: ', bold: true, size: 28 }),
              new TextRun({ text: c.total, bold: true, size: 28, color: PETROLEO }),
            ],
          }),
          // En dólares, el cliente tiene que saber a qué cotización se tomó (RF-28).
          ...(c.cotizacion ? [linea(c.cotizacion, { gris: true })] : []),
          new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('Condiciones')] }),
          ...c.condiciones.map((x) => new Paragraph({ spacing: { after: 120 }, children: [new TextRun(x)] })),
          campo('Validez de la oferta', c.validez),
          linea(c.vigencia, { gris: true }),
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
