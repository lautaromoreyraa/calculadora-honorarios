// Validación común de todo dato externo antes de que llegue a datos/ (RF-23).
// Funciones puras: las usan los scripts de las Actions (dólar, índices, nafta),
// que son los únicos que leen APIs. Un dato que no pasa frena la corrida a la
// vista; nunca se publica «lo que vino».

/**
 * Cuánto puede moverse un valor de una actualización a la siguiente, como
 * fracción: subida 0,2 es «hasta 20 % más», bajada 0,5 es «hasta la mitad».
 * Se configura por rutina en datos/parametros.json (rangosDeVariacion).
 */
export interface RangoDeVariacion {
  maximaSubida: number;
  maximaBajada: number;
}

/** Un número finito y positivo, o un error que dice qué dato vino mal. */
export function numeroPositivo(valor: unknown, dato: string): number {
  const numero = typeof valor === 'string' && valor.trim() !== '' ? Number(valor) : valor;
  if (typeof numero !== 'number' || !Number.isFinite(numero) || numero <= 0) {
    throw new Error(`${dato}: se esperaba un número positivo y llegó ${JSON.stringify(valor)}.`);
  }
  return numero;
}

/**
 * Frena un valor que se aleja del anterior más de lo que el rango admite. Un
 * salto así es más probablemente un error de la fuente (un cambio de base, una
 * celda corrida) que la realidad: alguien lo mira antes de publicarlo.
 */
export function validarVariacion(dato: string, anterior: number, nuevo: number, rango: RangoDeVariacion): void {
  const variacion = nuevo / anterior - 1;
  if (variacion > rango.maximaSubida || variacion < -rango.maximaBajada) {
    const porcentaje = (variacion * 100).toFixed(1).replace('.', ',');
    throw new Error(`${dato} fuera de rango: ${nuevo} contra ${anterior} (${porcentaje} %).`);
  }
}

const MES = /^\d{4}-(0[1-9]|1[0-2])$/;

/** El mes que sigue a uno AAAA-MM. */
export function mesSiguiente(mes: string): string {
  if (!MES.test(mes)) throw new Error(`Mes inválido: ${mes}.`);
  const [anio, numero] = mes.split('-').map(Number);
  return numero === 12 ? `${anio + 1}-01` : `${anio}-${String(numero + 1).padStart(2, '0')}`;
}

/**
 * Un mes nuevo de un índice tiene que ser exactamente el siguiente al último
 * cargado: si falta uno en el medio, la proyección usaría un hueco (RF-20).
 */
export function validarMesSiguiente(dato: string, ultimo: string, nuevo: string): void {
  if (nuevo !== mesSiguiente(ultimo)) {
    throw new Error(`${dato}: llegó ${nuevo} y el siguiente a ${ultimo} es ${mesSiguiente(ultimo)}.`);
  }
}

/** Una fecha AAAA-MM-DD o un mes AAAA-MM no anterior al último cargado. */
export function noEsAnterior(nueva: string, anterior: string): boolean {
  return nueva >= anterior;
}
