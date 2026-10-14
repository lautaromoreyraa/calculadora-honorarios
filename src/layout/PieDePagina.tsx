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
        <p>
          Monotributo: {datos.monotributo.categorias.map((c) => `${c.letra} ${formatearPesos(c.impuestoIntegrado + c.sipa + c.obraSocial)}`).join(' · ')}{' '}
          por mes, según ARCA.
        </p>
        <p className="pie__credito">
          Basada en la investigación de alumnos de Comunicación de la Universidad Nacional del Nordeste (UNNE).
        </p>
        <p className="pie__privacidad">Lo que cargás no sale de tu navegador: no se guarda ni se envía a ningún lado.</p>
      </div>
    </footer>
  );
}
