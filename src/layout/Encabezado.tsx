import { formatearVigencia } from '../util/formulario.ts';

interface Props {
  vigencia: string;
  /** Dirección del formulario de la etapa de prueba (RF-31); sin ella no hay invitación. */
  encuesta?: string;
}

// En el celular el encabezado no puede comerse la primera pantalla: quien
// entra viene a cotizar. La explicación larga aparece recién con más ancho.
export function Encabezado({ vigencia, encuesta }: Props) {
  return (
    <header className="encabezado">
      <a className="salto" href="#resultado">
        Ir al resultado
      </a>
      <div className="encabezado__contenido">
        {/* La cursiva de Alegreya es la mano del título: marca la palabra que importa. */}
        <h1 className="encabezado__titulo">
          Calculadora de <em>honorarios</em>
        </h1>
        <p className="encabezado__bajada">
          Para autónomos de la comunicación del NEA.
          {/* En el celular, una línea que diga qué suma: sin ella, quien entra por
              primera vez no sabe que el total incluye sus costos. */}
          <span className="encabezado__bajada-corta"> Tu hora de convenio, más lo que cuesta trabajar por tu cuenta.</span>
          <span className="encabezado__bajada-extendida">
            {' '}
            Parte del salario de convenio de tu rol y suma lo que pagás por trabajar por tu cuenta.
          </span>
        </p>
        <p className="encabezado__vigencia">
          Valores vigentes a <strong>{formatearVigencia(vigencia)}</strong>
        </p>
        {/* RF-31: un enlace y nada más; el formulario no se embebe y no recibe
            ningún dato de la calculadora (RNF-02, RNF-06). */}
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
