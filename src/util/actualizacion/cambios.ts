// Lo que va en el cuerpo de cada PR automático (RF-23): una tabla con los
// valores viejos y nuevos, para que quien mire la historia vea qué cambió sin
// abrir el diff, y el control de que el PR toque sólo los datos de su rutina.

export interface Cambio {
  dato: string;
  anterior: number | null;
  nuevo: number;
}

const numero = (n: number) => n.toLocaleString('es-AR', { maximumFractionDigits: 4 });

/** Tabla en Markdown con la variación de cada dato; «—» si el dato es nuevo. */
export function tablaDeCambios(cambios: Cambio[]): string {
  const filas = cambios.map(({ dato, anterior, nuevo }) => {
    const variacion =
      anterior === null ? '—' : `${((nuevo / anterior - 1) * 100).toFixed(2).replace('.', ',')} %`;
    return `| ${dato} | ${anterior === null ? '—' : numero(anterior)} | ${numero(nuevo)} | ${variacion} |`;
  });
  return ['| Dato | Anterior | Nuevo | Variación |', '|---|---:|---:|---:|', ...filas].join('\n');
}

/**
 * Los archivos que un PR automático cambió fuera de los que su rutina puede
 * tocar. Si la lista no está vacía, el PR no se mergea solo: algo raro pasó (un
 * script que escribe donde no debe, una dependencia que toca el repo).
 */
export function archivosNoPermitidos(cambiados: string[], permitidos: string[]): string[] {
  const permitidosNormalizados = new Set(permitidos.map((p) => p.replaceAll('\\', '/')));
  return cambiados.map((c) => c.replaceAll('\\', '/')).filter((c) => !permitidosNormalizados.has(c));
}

/**
 * Rutas de la salida de `git status --porcelain -z`, incluidos los archivos
 * nuevos. Con -z las rutas vienen separadas por NUL y sin comillas: un archivo
 * llamado «x -> datos/parametros.json» no se puede hacer pasar por otro. En un
 * renombre, git agrega la ruta de origen como entrada aparte, y las dos cuentan.
 */
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
