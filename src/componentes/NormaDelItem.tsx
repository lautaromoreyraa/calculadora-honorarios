import { formatearVigencia } from '../util/formulario.ts';

interface Props {
  nombre: string;
  norma: string;
  vigencia: string;
}

export function NormaDelItem({ nombre, norma, vigencia }: Props) {
  return (
    <details className="norma">
      <summary className="norma__resumen" aria-label={`Norma de ${nombre}`}>
        Norma
      </summary>
      <p className="norma__texto">
        {norma}. <span className="norma__vigencia">Valor vigente desde {formatearVigencia(vigencia)}.</span>
      </p>
    </details>
  );
}
