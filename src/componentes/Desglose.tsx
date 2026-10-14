import { useNumeroAnimado } from '../hooks/useNumeroAnimado.ts';
import { useValorDiferido } from '../hooks/useValorDiferido.ts';
import type { MouseEvent } from 'react';
import type { Calculo, Falta } from '../util/calculo/tipos.ts';
import { useFormato } from '../contexto/Moneda.tsx';
import { composicionDelTotal } from '../util/composicion.ts';
import { datos } from '../util/datos/index.ts';
import { formatearNumero } from '../util/formato.ts';
import { ComposicionDelTotal } from './ComposicionDelTotal.tsx';
import { idDeCampo } from '../util/formulario.ts';

interface Props {
  calculo: Calculo;
}

/** Total y desglose renglón por renglón (RF-15). Si falta algo, dice qué. */
export function Desglose({ calculo }: Props) {
  const formato = useFormato();
  // El anuncio vive en un nodo que no cambia entre «faltan datos» y el total,
  // así el lector de pantalla lo sigue; y espera a que se termine de escribir.
  const anuncio = useValorDiferido(
    calculo.ok ? `Total del trabajo: ${formato.monto(calculo.resultado.total)}` : 'Faltan datos para calcular el total',
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

/** Lleva el foco al campo: un enlace a #id sólo desplaza, y con teclado o lector hay que llegar al control. */
function irAlCampo(evento: MouseEvent<HTMLAnchorElement>, campo: string) {
  const control = document.getElementById(idDeCampo(campo));
  if (!control) return;
  evento.preventDefault();
  control.focus();
  control.scrollIntoView({ block: 'center' });
}

function Pendiente({ errores }: { errores: Falta[] }) {
  return (
    <>
      <p className="desglose__total-etiqueta">Total del trabajo</p>
      <p className="desglose__total desglose__total--vacio">Faltan datos para calcular</p>
      <ul className="desglose__falta">
        {errores.map((e) => (
          <li key={e.mensaje}>
            <a href={`#${idDeCampo(e.campo)}`} onClick={(evento) => irAlCampo(evento, e.campo)}>
              {e.mensaje}
            </a>
          </li>
        ))}
      </ul>
    </>
  );
}

function Resultado({ calculo }: { calculo: Extract<Calculo, { ok: true }> }) {
  const formato = useFormato();
  const r = calculo.resultado;
  const iibb = r.ingresosBrutosSobreTotal;
  // El único movimiento de la página: el total cuenta hasta su valor nuevo. Lo
  // que se anuncia al lector de pantalla es el valor final, no los intermedios.
  const totalMostrado = useNumeroAnimado(r.total);
  return (
    <>
      <p className="desglose__total-etiqueta">Total del trabajo</p>
      <p className="desglose__total" aria-hidden="true">
        {formato.monto(formato.redondear(totalMostrado))}
      </p>
      <p className="desglose__contexto">
        {r.rol.nombre}, {formatearNumero(r.horas)} h a {formato.montoConCentavos(r.valorHora)} la hora
      </p>
      <ComposicionDelTotal partes={composicionDelTotal(r, datos)} total={r.total} />

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
              <td className="desglose__monto">{formato.monto(renglon.monto)}</td>
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
                <td className="desglose__monto">{formato.monto(r.subtotal)}</td>
              </tr>
              <tr className="desglose__renglon">
                <th scope="row" className="desglose__concepto">
                  {iibb.concepto}
                  <span className="desglose__detalle">{iibb.detalle}</span>
                </th>
                <td className="desglose__monto">{formato.monto(iibb.monto)}</td>
              </tr>
            </>
          )}
          <tr className="desglose__renglon desglose__renglon--total">
            <th scope="row" className="desglose__concepto">
              Total
            </th>
            <td className="desglose__monto">{formato.monto(r.total)}</td>
          </tr>
        </tfoot>
      </table>
    </>
  );
}
