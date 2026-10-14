import type { Datos } from '../util/datos/tipos.ts';
import { formatearPesos, formatearPesosConCentavos } from '../util/formato.ts';
import { formatearFecha, formatearVigencia } from '../util/formulario.ts';

interface Props {
  datos: Datos;
  vigencia: string;
}

/** Crédito, aviso y de dónde salen los valores (RF-19). */
export function PieDePagina({ datos, vigencia }: Props) {
  const { dolarOficial } = datos.parametros;
  return (
    <footer className="pie">
      <div className="pie__contenido">
        <p className="pie__aviso">
          <strong>Es una referencia, no asesoramiento contable.</strong> Los montos salen de convenios colectivos y
          normas vigentes, pero cada situación fiscal es distinta: ante una duda, consultá con un contador.
        </p>
        <p>
          Valores vigentes a {formatearVigencia(vigencia)}. Dólar oficial de referencia:{' '}
          {formatearPesosConCentavos(dolarOficial.valor)} ({dolarOficial.fuente}, {formatearFecha(dolarOficial.fecha)}).
          Nafta súper: mediana de las estaciones de cada provincia ({datos.combustible.fuente}).
        </p>
        <div className="pie__monotributo">
          <p>Cuota mensual del monotributo para servicios, según ARCA:</p>
          {/* Una lista y no una frase: con varias categorías, «A $ … · B $ …» no se lee. */}
          <dl className="pie__categorias">
            {datos.monotributo.categorias.map((c) => (
              <div key={c.letra} className="pie__categoria">
                <dt>Categoría {c.letra}</dt>
                <dd>{formatearPesos(c.impuestoIntegrado + c.sipa + c.obraSocial)}</dd>
              </div>
            ))}
          </dl>
        </div>
        <p>Basada en la investigación de alumnos de Comunicación de la Universidad Nacional del Nordeste (UNNE).</p>
        <p>
          Lo que cargás no sale de tu navegador: no se envía a ningún lado. Tu rol, tus costos y tu nombre se recuerdan
          sólo en este equipo, y «Empezar de nuevo» los borra.
        </p>
      </div>
    </footer>
  );
}
