import { formatearVigencia } from '../util/formulario.ts';

interface Props {
  vigencia: string;
}

// En el celular el encabezado no puede comerse la primera pantalla: quien
// entra viene a cotizar. La explicación larga aparece recién con más ancho.
export function Encabezado({ vigencia }: Props) {
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
          Para autónomos de la comunicación de Chaco y Corrientes.
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
      </div>
    </header>
  );
}
