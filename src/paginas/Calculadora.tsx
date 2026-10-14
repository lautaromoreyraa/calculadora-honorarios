import { useId } from 'react';
import { BarraDelTotal } from '../componentes/BarraDelTotal.tsx';
import { CampoNumerico } from '../componentes/CampoNumerico.tsx';
import { Desglose } from '../componentes/Desglose.tsx';
import DescargaDePresupuesto from '../componentes/DescargaDePresupuesto.tsx';
import { ItemConCasilla, type DescripcionDeCampo } from '../componentes/ItemConCasilla.tsx';
import { OpcionesExcluyentes } from '../componentes/OpcionesExcluyentes.tsx';
import { useCalculadora } from '../hooks/useCalculadora.ts';
import { Encabezado } from '../layout/Encabezado.tsx';
import { PieDePagina } from '../layout/PieDePagina.tsx';
import { datos } from '../util/datos/index.ts';
import type { Item } from '../util/datos/tipos.ts';
import { formatearPesos, formatearPesosConCentavos } from '../util/formato.ts';
import {
  camposDeItem,
  formatearFecha,
  leerNumero,
  resumenDelItem,
  valorHoraDelRol,
  vigenciaDeLosDatos,
  type Campo,
} from '../util/formulario.ts';
import '../estilos/calculadora.css';
import '../estilos/desglose.css';

const vigencia = vigenciaDeLosDatos(datos);

/** Error de un campo numérico escrito: vacío no es error todavía, sólo «falta». */
function errorDeNumero(texto: string, minimo: 'positivo' | 'no-negativo'): string | undefined {
  if (texto.trim() === '') return undefined;
  const n = leerNumero(texto);
  if (Number.isNaN(n)) return 'Escribí sólo números, por ejemplo 7,5.';
  if (minimo === 'positivo' && n <= 0) return 'Tiene que ser más que cero.';
  if (minimo === 'no-negativo' && n < 0) return 'No puede ser negativo.';
  return undefined;
}

export function Calculadora() {
  const { estado, calculo, cambiar, alternar, elegir, cargar } = useCalculadora(datos);
  const idRol = useId();
  const idCategoria = useId();
  const idTituloResultado = useId();

  const rol = datos.roles.find((r) => r.id === estado.rolId)!;
  const provincia = datos.provincias.find((p) => p.id === estado.provinciaId)!;
  const nafta = datos.combustible.precios[provincia.id];

  const describirCampo = (campo: Campo): DescripcionDeCampo => {
    switch (campo) {
      case 'precio':
        return {
          etiqueta: 'Precio del equipo',
          prefijo: '$',
          ayuda: `Se reparte en ${datos.parametros.vidaUtilDeEquiposEnMeses.valor} meses de uso.`,
        };
      case 'monto':
        return { etiqueta: 'Monto', prefijo: '$' };
      case 'km':
        return {
          etiqueta: 'Kilómetros a recorrer',
          unidad: 'km',
          ayuda: nafta
            ? `Nafta súper en ${provincia.nombre}: ${formatearPesos(nafta.precio)} el litro, precio al ${formatearFecha(nafta.fecha)}.`
            : undefined,
        };
      case 'consumo':
        return { etiqueta: 'Consumo del auto', unidad: 'l/100 km' };
    }
  };

  const resumen = (item: Item) => resumenDelItem(item, estado, datos);

  return (
    <>
      <Encabezado vigencia={vigencia} />
      <main className="calculadora">
        <form className="calculadora__formulario" aria-label="Datos del trabajo" onSubmit={(e) => e.preventDefault()}>
          <section className="bloque" aria-labelledby={`${idRol}-titulo`}>
            <h2 className="bloque__titulo" id={`${idRol}-titulo`}>
              El trabajo
            </h2>

            <div className="campo">
              <label className="campo__etiqueta" htmlFor={idRol}>
                Rol
              </label>
              <select
                id={idRol}
                className="campo__seleccion"
                value={estado.rolId}
                aria-describedby={`${idRol}-ficha`}
                onChange={(e) => cambiar('rolId', e.target.value)}
              >
                {datos.roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nombre}
                  </option>
                ))}
              </select>
              <p className="ficha-del-rol" id={`${idRol}-ficha`}>
                <span className="ficha-del-rol__valor">
                  {formatearPesosConCentavos(valorHoraDelRol(rol.id, datos))} la hora
                </span>
                <span className="ficha-del-rol__convenio">
                  {formatearPesos(rol.valorBaseMensual)} por mes de convenio
                </span>
                <span className="ficha-del-rol__convenio">{rol.convenio}</span>
              </p>
            </div>

            <div className="bloque__fila">
              <CampoNumerico
                etiqueta="Horas del trabajo"
                unidad="h"
                placeholder="Por ejemplo, 8"
                valor={estado.horas}
                alCambiar={(v) => cambiar('horas', v)}
                error={errorDeNumero(estado.horas, 'positivo')}
              />
              <CampoNumerico
                etiqueta="Antigüedad"
                unidad="años"
                ayuda="Años de ejercicio profesional."
                valor={estado.antiguedad}
                alCambiar={(v) => cambiar('antiguedad', v)}
                error={errorDeNumero(estado.antiguedad, 'no-negativo')}
              />
            </div>

            <fieldset className="opciones opciones--en-linea">
              <legend className="opciones__titulo">Provincia</legend>
              {datos.provincias.map((p) => (
                <label key={p.id} className={`opcion${estado.provinciaId === p.id ? ' opcion--elegida' : ''}`}>
                  <input
                    className="opcion__radio"
                    type="radio"
                    name="provincia"
                    checked={estado.provinciaId === p.id}
                    onChange={() => cambiar('provinciaId', p.id)}
                  />
                  <span className="opcion__texto">
                    <span className="opcion__nombre">{p.nombre}</span>
                  </span>
                </label>
              ))}
            </fieldset>

            <div className="campo">
              <label className="campo__etiqueta" htmlFor={idCategoria}>
                Categoría de monotributo
              </label>
              <select
                id={idCategoria}
                className="campo__seleccion"
                value={estado.categoria}
                onChange={(e) => cambiar('categoria', e.target.value)}
              >
                {datos.monotributo.categorias.map((c) => (
                  <option key={c.letra} value={c.letra}>
                    {c.letra}: facturación de hasta {formatearPesos(c.topeAnual)} al año
                  </option>
                ))}
              </select>
            </div>
          </section>

          {datos.grupos.map((grupo) => {
            const delGrupo = datos.items.filter((i) => i.grupo === grupo.id);
            const exclusiones = datos.exclusiones.filter((e) => delGrupo.some((i) => i.exclusion === e.id));
            const sueltos = delGrupo.filter((i) => !i.exclusion);
            const idTitulo = `grupo-${grupo.id}`;
            return (
              <section key={grupo.id} className="bloque" aria-labelledby={idTitulo}>
                <h2 className="bloque__titulo" id={idTitulo}>
                  {grupo.nombre}
                </h2>
                {exclusiones.map((exclusion) => (
                  <OpcionesExcluyentes
                    key={exclusion.id}
                    exclusion={exclusion}
                    opciones={delGrupo.filter((i) => i.exclusion === exclusion.id)}
                    resumen={resumen}
                    elegido={estado.elegidos[exclusion.id] ?? null}
                    alElegir={(itemId) => elegir(exclusion.id, itemId)}
                    tituloOculto={exclusion.nombre === grupo.nombre}
                  />
                ))}
                {sueltos.length > 0 && (
                  <div className="items">
                    {sueltos.map((item) => (
                      <ItemConCasilla
                        key={item.id}
                        item={item}
                        resumen={resumen(item)}
                        marcado={Boolean(estado.marcados[item.id])}
                        alAlternar={(m) => alternar(item.id, m)}
                        campos={camposDeItem(item)}
                        describirCampo={describirCampo}
                        entradas={estado.entradas[item.id] ?? {}}
                        alCargar={(campo, v) => cargar(item.id, campo, v)}
                      />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </form>

        <aside id="resultado" className="calculadora__resultado" aria-labelledby={idTituloResultado} tabIndex={-1}>
          <h2 className="solo-lectores" id={idTituloResultado}>
            Resultado
          </h2>
          <Desglose calculo={calculo} />
        </aside>
        {/* RF-16: sólo con un resultado válido hay algo para presupuestar. Va fuera
            del panel del resultado: en escritorio ese panel queda fijo, y el
            formulario adentro quedaba al fondo de un segundo scroll. */}
        {calculo.ok && (
          <div id="presupuesto" className="calculadora__presupuesto">
            <DescargaDePresupuesto resultado={calculo.resultado} />
          </div>
        )}
      </main>
      <PieDePagina datos={datos} vigencia={vigencia} />
      <BarraDelTotal calculo={calculo} />
    </>
  );
}
