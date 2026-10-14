import { useState, type ReactNode } from 'react';

interface Props {
  nombre: string;
  /** «2 marcados · $ 9.000»: lo que suma el subgrupo sin tener que abrirlo. */
  cuenta: string;
  /** Arranca abierto si ya tiene algo marcado, para que no quede escondido. */
  abiertoAlInicio: boolean;
  children: ReactNode;
}

/**
 * Parte plegable de un grupo largo (RF-27): con quince casillas abiertas, los
 * costos operativos ocupaban media página en el celular. Un <details> nativo:
 * se abre con teclado y el lector anuncia si está expandido.
 */
export function SubgrupoPlegable({ nombre, cuenta, abiertoAlInicio, children }: Props) {
  const [abierto, setAbierto] = useState(abiertoAlInicio);
  return (
    <details className="subgrupo" open={abierto} onToggle={(e) => setAbierto(e.currentTarget.open)}>
      <summary className="subgrupo__resumen">
        <span className="subgrupo__nombre">{nombre}</span>
        <span className="subgrupo__cuenta">{cuenta}</span>
      </summary>
      <div className="items subgrupo__items">{children}</div>
    </details>
  );
}
