
const fechaLarga = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });

export function textoDeValidez(validez: string): string {
  const [anio, mes, dia] = validez.split('-').map(Number);
  if (!anio || !mes || !dia) return '';
  return `hasta el ${fechaLarga.format(new Date(anio, mes - 1, dia))}`;
}

export function fechaDentroDe(dias: number, desde: Date = new Date()): string {
  const d = new Date(desde.getFullYear(), desde.getMonth(), desde.getDate() + dias);
  return [d.getFullYear(), d.getMonth() + 1, d.getDate()].map((n) => String(n).padStart(2, '0')).join('-');
}
