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
        <p className="encabezado__sobre">Valores a {formatearVigencia(vigencia)}</p>
        <h1 className="encabezado__titulo">Calculadora de honorarios</h1>
        <p className="encabezado__bajada">
          Para autónomos de la comunicación de Chaco y Corrientes.
          <span className="encabezado__bajada-extendida">
            {' '}
            Parte del salario de convenio de tu rol y suma lo que pagás por trabajar por tu cuenta.
          </span>
        </p>
      </div>
    </header>
  );
}
