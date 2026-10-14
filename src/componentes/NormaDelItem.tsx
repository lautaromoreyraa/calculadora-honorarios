import { formatearVigencia } from '../util/formulario.ts';

interface Props {
  /** Nombre del ítem: el lector de pantalla oye «Norma de Multifunción», no trece «Norma» iguales. */
  nombre: string;
  norma: string;
  vigencia: string;
}

/** De dónde sale un valor y desde cuándo rige (RF-19). Cerrado por defecto para no cargar la pantalla. */
export function NormaDelItem({ nombre, norma, vigencia }: Props) {
  return (
    <details className="norma">
      <summary className="norma__resumen">
        Norma<span className="solo-lectores"> de {nombre}</span>
      </summary>
      <p className="norma__texto">
        {norma}. <span className="norma__vigencia">Valor vigente desde {formatearVigencia(vigencia)}.</span>
      </p>
    </details>
  );
}
