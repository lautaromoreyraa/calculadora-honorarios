
export interface Cambio {
  dato: string;
  anterior: number | null;
  nuevo: number;
}

const numero = (n: number) => n.toLocaleString('es-AR', { maximumFractionDigits: 4 });

export function tablaDeCambios(cambios: Cambio[]): string {
  const filas = cambios.map(({ dato, anterior, nuevo }) => {
    const variacion =
      anterior === null ? '—' : `${((nuevo / anterior - 1) * 100).toFixed(2).replace('.', ',')} %`;
    return `| ${dato} | ${anterior === null ? '—' : numero(anterior)} | ${numero(nuevo)} | ${variacion} |`;
  });
  return ['| Dato | Anterior | Nuevo | Variación |', '|---|---:|---:|---:|', ...filas].join('\n');
}

export function archivosNoPermitidos(cambiados: string[], permitidos: string[]): string[] {
  const permitidosNormalizados = new Set(permitidos.map((p) => p.replaceAll('\\', '/')));
  return cambiados.map((c) => c.replaceAll('\\', '/')).filter((c) => !permitidosNormalizados.has(c));
}

export function rutasDeGitStatus(salida: string): string[] {
  const entradas = salida.split('\0').filter((e) => e !== '');
  const rutas: string[] = [];
  for (let i = 0; i < entradas.length; i++) {
    const estado = entradas[i].slice(0, 2);
    rutas.push(entradas[i].slice(3));
    if (estado.includes('R') || estado.includes('C')) rutas.push(entradas[++i]);
  }
  return rutas;
}
