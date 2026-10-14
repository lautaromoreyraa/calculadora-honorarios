import type { PorcionDelTotal } from '../util/composicion.ts';
import { useFormato } from '../contexto/Moneda.tsx';
import { formatearPorcentaje } from '../util/formato.ts';

interface Props {
  partes: PorcionDelTotal[];
  total: number;
}

/**
 * De dónde sale cada peso (RNF-13, RF-15): una barra repartida en partes y su
 * leyenda. La barra es sólo para la vista; la leyenda dice lo mismo en texto,
 * así el color nunca es lo único que distingue una parte de otra.
 */
export function ComposicionDelTotal({ partes, total }: Props) {
  const formato = useFormato();
  if (total <= 0 || partes.length === 0) return null;
  return (
    <div className="composicion">
      <div className="composicion__barra" aria-hidden="true">
        {partes.map((p) => (
          <span
            key={p.parte}
            className={`composicion__tramo composicion__tramo--${p.parte}`}
            style={{ flexGrow: p.monto }}
          />
        ))}
      </div>
      <ul className="composicion__leyenda" aria-label="Composición del total">
        {partes.map((p) => (
          <li key={p.parte} className="composicion__parte">
            <span className={`composicion__muestra composicion__tramo--${p.parte}`} aria-hidden="true" />
            <span className="composicion__nombre">{p.nombre}</span>
            <span className="composicion__monto">
              {formato.monto(p.monto)}
              <span className="composicion__porcentaje"> · {formatearPorcentaje(Math.round((p.monto / total) * 100) / 100)}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
