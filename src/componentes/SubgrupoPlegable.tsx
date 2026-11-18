import { useState, type ReactNode } from 'react';

interface Props {
  nombre: string;
  cuenta: string;
  abiertoAlInicio: boolean;
  children: ReactNode;
}

export function SubgrupoPlegable({ nombre, cuenta, abiertoAlInicio, children }: Props) {
  const [abierto, setAbierto] = useState(abiertoAlInicio);
  return (
    <details className="subgrupo" open={abierto} onToggle={(e) => setAbierto(e.currentTarget.open)}>
      <summary className="subgrupo__resumen">
        <span className="subgrupo__nombre">{nombre}</span>
        <span className="subgrupo__cuenta">{cuenta}</span>
        <span className="subgrupo__abrir" aria-hidden="true">
          {abierto ? 'Ocultar' : 'Ver ítems'}
        </span>
      </summary>
      <div className="items subgrupo__items">{children}</div>
    </details>
  );
}
