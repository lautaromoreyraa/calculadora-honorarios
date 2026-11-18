import { formatearVigencia } from '../util/formulario.ts';

interface Props {
  vigencia: string;
  encuesta?: string;
}

export function Encabezado({ vigencia, encuesta }: Props) {
  return (
    <header className="encabezado">
      <a className="salto" href="#resultado">
        Ir al resultado
      </a>
      <div className="encabezado__contenido">
        <h1 className="encabezado__titulo">
          Calculadora de <em>honorarios</em>
        </h1>
        <p className="encabezado__bajada">
          Para autónomos de la comunicación del NEA.
          <span className="encabezado__bajada-corta"> Tu hora de convenio, más lo que cuesta trabajar por tu cuenta.</span>
          <span className="encabezado__bajada-extendida">
            {' '}
            Parte del salario de convenio de tu rol y suma lo que pagás por trabajar por tu cuenta.
          </span>
        </p>
        <p className="encabezado__vigencia">
          Valores vigentes a <strong>{formatearVigencia(vigencia)}</strong>
        </p>
        {encuesta && (
          <p className="encabezado__encuesta">
            Si utilizaste la calculadora,{' '}
            <a href={encuesta} target="_blank" rel="noopener noreferrer">
              dejanos tu reseña
              <span className="solo-lectores"> (se abre en otra pestaña)</span>
            </a>
            . ¡Gracias!
          </p>
        )}
      </div>
    </header>
  );
}
