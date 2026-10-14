// Presupuesto en Word (RF-16). Arma un .docx editable con el resultado del motor
// para que el profesional lo retoque y se lo mande a su cliente. Va sin marca
// del proyecto: el documento es del profesional. Lleva el trabajo y el total,
// no el desglose: lo que le cuesta al profesional trabajar por su cuenta
// (contador, fondos, impuestos) es suyo, no del cliente. Este módulo importa docx, que
// es pesado; la interfaz lo carga con import() recién al pedir la descarga.
import { BorderStyle, Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx';
import type { Datos } from '../datos/tipos.ts';
import type { Resultado } from '../calculo/tipos.ts';
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

// Cambria viene con Office y LibreOffice la reemplaza por Caladea, de la misma
// métrica: una serifa como la de los títulos del sitio. El petróleo es el de la
// franja del encabezado (RNF-10), así el documento se reconoce sin llevar marca.
const FUENTE_DE_TITULOS = 'Cambria';
const PETROLEO = '0C5952';
const LINEA = { style: BorderStyle.SINGLE, size: 6, color: 'BFBFBF', space: 6 };

const campo = (etiqueta: string, valor: string) =>
  new Paragraph({ children: [new TextRun({ text: `${etiqueta}: `, bold: true }), new TextRun(valor)] });

/** Arma el documento. Pura: no toca el navegador ni la red. */
export function armarPresupuesto(resultado: Resultado, datos: Datos, presupuesto: DatosDelPresupuesto): Document {
  return new Document({
    creator: completar(presupuesto.profesional, ''),
    title: 'Presupuesto',
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
          campo('Profesional', `${completar(presupuesto.profesional, MARCADORES.profesional)} · ${resultado.rol.nombre}`),
          campo('Cliente', completar(presupuesto.cliente, MARCADORES.cliente)),
          campo('Fecha', fechaLarga.format(presupuesto.fecha ?? new Date())),
          new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('Trabajo')] }),
          new Paragraph(completar(presupuesto.descripcion, MARCADORES.descripcion)),
          campo('Horas estimadas', `${formatearNumero(resultado.horas)} h`),
          new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun('Honorarios')] }),
          new Paragraph({
            spacing: { before: 120, after: 120 },
            border: { top: LINEA, bottom: LINEA },
            children: [
              new TextRun({ text: 'Total del trabajo: ', bold: true, size: 28 }),
              new TextRun({ text: formatearPesos(resultado.total), bold: true, size: 28, color: PETROLEO }),
            ],
          }),
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
