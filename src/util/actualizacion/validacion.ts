
export interface RangoDeVariacion {
  maximaSubida: number;
  maximaBajada: number;
}

export function numeroPositivo(valor: unknown, dato: string): number {
  const numero = typeof valor === 'string' && valor.trim() !== '' ? Number(valor) : valor;
  if (typeof numero !== 'number' || !Number.isFinite(numero) || numero <= 0) {
    throw new Error(`${dato}: se esperaba un número positivo y llegó ${JSON.stringify(valor)}.`);
  }
  return numero;
}

export function validarVariacion(dato: string, anterior: number, nuevo: number, rango: RangoDeVariacion): void {
  const variacion = nuevo / anterior - 1;
  if (variacion > rango.maximaSubida || variacion < -rango.maximaBajada) {
    const porcentaje = (variacion * 100).toFixed(1).replace('.', ',');
    throw new Error(`${dato} fuera de rango: ${nuevo} contra ${anterior} (${porcentaje} %).`);
  }
}

const MES = /^\d{4}-(0[1-9]|1[0-2])$/;

export function mesSiguiente(mes: string): string {
  if (!MES.test(mes)) throw new Error(`Mes inválido: ${mes}.`);
  const [anio, numero] = mes.split('-').map(Number);
  return numero === 12 ? `${anio + 1}-01` : `${anio}-${String(numero + 1).padStart(2, '0')}`;
}

export function validarMesSiguiente(dato: string, ultimo: string, nuevo: string): void {
  if (nuevo !== mesSiguiente(ultimo)) {
    throw new Error(`${dato}: llegó ${nuevo} y el siguiente a ${ultimo} es ${mesSiguiente(ultimo)}.`);
  }
}

export function noEsAnterior(nueva: string, anterior: string): boolean {
  return nueva >= anterior;
}
