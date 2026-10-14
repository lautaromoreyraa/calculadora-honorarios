// Fechas del presupuesto. Aparte del generador del Word: la pantalla las usa
// para el calendario, y si importara de index.ts arrastraría docx al bundle
// principal, que se baja recién al pedir la descarga.

const fechaLarga = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });

/** «2026-10-29» → «hasta el 29 de octubre de 2026». La fecha es del calendario, sin hora ni zona. */
export function textoDeValidez(validez: string): string {
  const [anio, mes, dia] = validez.split('-').map(Number);
  if (!anio || !mes || !dia) return '';
  return `hasta el ${fechaLarga.format(new Date(anio, mes - 1, dia))}`;
}

/** Hoy más `dias`, como AAAA-MM-DD en la hora local: lo que espera un input de fecha. */
export function fechaDentroDe(dias: number, desde: Date = new Date()): string {
  const d = new Date(desde.getFullYear(), desde.getMonth(), desde.getDate() + dias);
  return [d.getFullYear(), d.getMonth() + 1, d.getDate()].map((n) => String(n).padStart(2, '0')).join('-');
}
