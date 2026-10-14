import { formatearVigencia } from '../util/formulario.ts';

interface Props {
  vigencia: string;
}

export function Encabezado({ vigencia }: Props) {
  return (
    <header className="encabezado">
      <a className="salto" href="#resultado">
        Ir al resultado
      </a>
      <div className="encabezado__contenido">
        <p className="encabezado__sobre">Honorarios de referencia · Chaco y Corrientes</p>
        <h1 className="encabezado__titulo">Calculadora de honorarios</h1>
        <p className="encabezado__bajada">
          Para periodistas, editores, community managers y demás trabajadores autónomos de la comunicación. Parte del
          salario de convenio de tu rol y suma lo que pagás por trabajar por tu cuenta.
        </p>
        <p className="encabezado__vigencia">Valores a {formatearVigencia(vigencia)}</p>
      </div>
    </header>
  );
}
