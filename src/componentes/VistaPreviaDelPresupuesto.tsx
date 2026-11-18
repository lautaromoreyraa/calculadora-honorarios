import type { ContenidoDelPresupuesto } from '../util/presupuesto/contenido.ts';

export function VistaPreviaDelPresupuesto({ contenido: c }: { contenido: ContenidoDelPresupuesto }) {
  return (
    <figure className="hoja-figura">
      <figcaption className="hoja-figura__titulo">Vista previa</figcaption>
      <div className="hoja">
        <p className="hoja__titulo">Presupuesto</p>
        <p className="hoja__gris">
          N.º {c.numero} · {c.fecha}
        </p>

        <div className="hoja__partes">
          <div>
            <p className="hoja__rotulo">De</p>
            <p className="hoja__fuerte">{c.profesional.nombre}</p>
            <p>{c.profesional.rol}</p>
            {c.profesional.contacto.map((x) => (
              <p key={x} className="hoja__gris">
                {x}
              </p>
            ))}
          </div>
          <div>
            <p className="hoja__rotulo">Para</p>
            <p className="hoja__fuerte">{c.cliente.empresa}</p>
            {c.cliente.contacto && <p>{c.cliente.contacto}</p>}
          </div>
        </div>

        <p className="hoja__seccion">Trabajo</p>
        <table className="hoja__tabla">
          <thead>
            <tr>
              <th scope="col">Descripción</th>
              <th scope="col" className="hoja__cifra">
                Horas
              </th>
              <th scope="col" className="hoja__cifra">
                Valor por hora
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="hoja__descripcion">{c.trabajo.descripcion}</td>
              <td className="hoja__cifra">{c.trabajo.horas}</td>
              <td className="hoja__cifra">{c.trabajo.valorHora}</td>
            </tr>
          </tbody>
        </table>
        <p className="hoja__total">
          Total del trabajo: <strong>{c.total}</strong>
        </p>
        {c.cotizacion && <p className="hoja__gris">{c.cotizacion}</p>}

        <p className="hoja__seccion">Condiciones</p>
        {c.condiciones.map((x, i) => (
          <p key={i}>{x}</p>
        ))}
        <p>
          <strong>Validez de la oferta:</strong> {c.validez}
        </p>
        <p className="hoja__gris">{c.fundamento}</p>
        <p className="hoja__gris">{c.vigencia}</p>
      </div>
    </figure>
  );
}
