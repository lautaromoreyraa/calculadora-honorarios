import { useState, type ReactNode } from 'react';

interface Props {
  nombre: string;
  /** «4 ítems · 2 marcados · $ 9.000»: lo que tiene y suma el subgrupo sin tener que abrirlo. */
  cuenta: string;
  /** Arranca abierto el primero y los que ya tienen algo marcado, para que no quede escondido. */
  abiertoAlInicio: boolean;
  children: ReactNode;
}

/**
 * Parte plegable de un grupo largo (RF-27): con quince casillas abiertas, los
 * costos operativos ocupaban media página en el celular. Un <details> nativo:
 * se abre con teclado y el lector anuncia si está expandido. Cerrado, muestra
 * «Ver ítems» con forma de botón (RF-46): en las pruebas, el resumen solo no
 * se leía como algo que se abre y los costos se pasaban de largo.
 */
export function SubgrupoPlegable({ nombre, cuenta, abiertoAlInicio, children }: Props) {
  const [abierto, setAbierto] = useState(abiertoAlInicio);
  return (
    <details className="subgrupo" open={abierto} onToggle={(e) => setAbierto(e.currentTarget.open)}>
      <summary className="subgrupo__resumen">
        <span className="subgrupo__nombre">{nombre}</span>
        <span className="subgrupo__cuenta">{cuenta}</span>
        {/* El lector ya anuncia «contraído»: la invitación es para la vista. */}
        <span className="subgrupo__abrir" aria-hidden="true">
          {abierto ? 'Ocultar' : 'Ver ítems'}
        </span>
      </summary>
      <div className="items subgrupo__items">{children}</div>
    </details>
  );
}
