import { useValorDiferido } from '../hooks/useValorDiferido.ts';
import type { Calculo } from '../util/calculo/tipos.ts';
import { formatearNumero, formatearPesos, formatearPesosConCentavos } from '../util/formato.ts';

interface Props {
  calculo: Calculo;
}

/** Total y desglose renglón por renglón (RF-15). Si falta algo, dice qué. */
export function Desglose({ calculo }: Props) {
  // El anuncio vive en un nodo que no cambia entre «faltan datos» y el total,
  // así el lector de pantalla lo sigue; y espera a que se termine de escribir.
  const anuncio = useValorDiferido(
    calculo.ok ? `Total del trabajo: ${formatearPesos(calculo.resultado.total)}` : 'Faltan datos para calcular el total',
    600,
  );

  return (
    <div className="desglose">
      <p className="solo-lectores" role="status">
        {anuncio}
      </p>
      {calculo.ok ? <Resultado calculo={calculo} /> : <Pendiente errores={calculo.errores} />}
    </div>
  );
}

function Pendiente({ errores }: { errores: string[] }) {
  return (
    <>
      <p className="desglose__total-etiqueta">Total del trabajo</p>
      <p className="desglose__total desglose__total--vacio">Faltan datos para calcular</p>
      <ul className="desglose__falta">
        {errores.map((e) => (
          <li key={e}>{e}</li>
        ))}
      </ul>
    </>
  );
}

function Resultado({ calculo }: { calculo: Extract<Calculo, { ok: true }> }) {
  const r = calculo.resultado;
  const iibb = r.ingresosBrutosSobreTotal;
  return (
    <>
      <p className="desglose__total-etiqueta">Total del trabajo</p>
      <p className="desglose__total">{formatearPesos(r.total)}</p>
      <p className="desglose__contexto">
        {r.rol.nombre}, {formatearNumero(r.horas)} h a {formatearPesosConCentavos(r.valorHora)} la hora
      </p>

      {r.avisos.length > 0 && (
        <ul className="desglose__avisos">
          {r.avisos.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      )}

      <table className="desglose__tabla">
        <caption className="solo-lectores">Desglose del honorario</caption>
        <thead className="solo-lectores">
          <tr>
            <th scope="col">Concepto</th>
            <th scope="col">Monto</th>
          </tr>
        </thead>
        <tbody>
          {r.renglones.map((renglon) => (
            <tr key={renglon.id} className="desglose__renglon">
              <th scope="row" className="desglose__concepto">
                {renglon.concepto}
                <span className="desglose__detalle">{renglon.detalle}</span>
              </th>
              <td className="desglose__monto">{formatearPesos(renglon.monto)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          {iibb && (
            <>
              <tr className="desglose__renglon desglose__renglon--subtotal">
                <th scope="row" className="desglose__concepto">
                  Subtotal
                </th>
                <td className="desglose__monto">{formatearPesos(r.subtotal)}</td>
              </tr>
              <tr className="desglose__renglon">
                <th scope="row" className="desglose__concepto">
                  {iibb.concepto}
                  <span className="desglose__detalle">{iibb.detalle}</span>
                </th>
                <td className="desglose__monto">{formatearPesos(iibb.monto)}</td>
              </tr>
            </>
          )}
          <tr className="desglose__renglon desglose__renglon--total">
            <th scope="row" className="desglose__concepto">
              Total
            </th>
            <td className="desglose__monto">{formatearPesos(r.total)}</td>
          </tr>
        </tfoot>
      </table>
    </>
  );
}
