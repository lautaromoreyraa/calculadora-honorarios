import { useEffect, useId } from 'react';
import { BarraDelTotal } from '../componentes/BarraDelTotal.tsx';
import { CampoNumerico } from '../componentes/CampoNumerico.tsx';
import { Desglose } from '../componentes/Desglose.tsx';
import DescargaDePresupuesto from '../componentes/DescargaDePresupuesto.tsx';
import { ItemConCasilla, type DescripcionDeCampo } from '../componentes/ItemConCasilla.tsx';
import { OpcionesExcluyentes } from '../componentes/OpcionesExcluyentes.tsx';
import { SubgrupoPlegable } from '../componentes/SubgrupoPlegable.tsx';
import { useCalculadora } from '../hooks/useCalculadora.ts';
import { Encabezado } from '../layout/Encabezado.tsx';
import { PieDePagina } from '../layout/PieDePagina.tsx';
import { datos } from '../util/datos/index.ts';
import type { Item } from '../util/datos/tipos.ts';
import { formatearPesos, formatearPesosConCentavos } from '../util/formato.ts';
import {
  camposDeItem,
  cuentaDelSubgrupo,
  formatearFecha,
  idDeCampo,
  leerNumero,
  resumenDelItem,
  valorHoraDelRol,
  vigenciaDeLosDatos,
  type Aporte,
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
  const { estado, calculo, vuelta, recuerda, reiniciado, cambiar, alternar, elegir, cargar, empezarDeNuevo, deshacer } =
    useCalculadora(datos);
  const idRol = useId();
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

  // Cuánto suma cada ítem a este trabajo, para mostrarlo junto a su casilla.
  const aportes = new Map<string, Aporte>();
  if (calculo.ok) {
    for (const r of calculo.resultado.renglones) aportes.set(r.id, { monto: r.monto, falta: r.falta });
    const iibb = calculo.resultado.ingresosBrutosSobreTotal;
    if (iibb) aportes.set(iibb.id, { monto: iibb.monto });
  }

  // Al reiniciar o deshacer, el formulario se vuelve a montar: la página sube y
  // el foco va al aviso (o al primer bloque), para no quedar en medio de la nada.
  const idAviso = `${idRol}-aviso`;
  useEffect(() => {
    if (vuelta === 0) return;
    window.scrollTo(0, 0);
    (document.getElementById(idAviso) ?? document.getElementById(`${idRol}-titulo`))?.focus();
  }, [vuelta, idAviso, idRol]);

  const itemConCasilla = (item: Item) => (
    <ItemConCasilla
      key={item.id}
      item={item}
      resumen={resumen(item)}
      marcado={Boolean(estado.marcados[item.id])}
      aporte={estado.marcados[item.id] ? aportes.get(item.id) : undefined}
      alAlternar={(m) => alternar(item.id, m)}
      campos={camposDeItem(item)}
      describirCampo={describirCampo}
      entradas={estado.entradas[item.id] ?? {}}
      alCargar={(campo, v) => cargar(item.id, campo, v)}
    />
  );

  return (
    <>
      <Encabezado vigencia={vigencia} />
      {/* Las keys llevan prefijo: son hermanos en el mismo fragmento y una key repetida
          hace que React no sepa cuál quitar y deje el formulario viejo en la página. */}
      <main className="calculadora" key={`formulario-${vuelta}`}>
        <form className="calculadora__formulario" aria-label="Datos del trabajo" onSubmit={(e) => e.preventDefault()}>
          {reiniciado && (
            <p className="aviso-de-reinicio" id={idAviso} tabIndex={-1}>
              Se borraron tus datos guardados.{' '}
              <button type="button" className="boton-de-texto" onClick={deshacer}>
                Deshacer
              </button>
            </p>
          )}
          <section className="bloque" aria-labelledby={`${idRol}-titulo`}>
            <h2 className="bloque__titulo" id={`${idRol}-titulo`} tabIndex={-1}>
              El trabajo
            </h2>

            <div className="campo">
              <label className="campo__etiqueta" htmlFor={idDeCampo('rol')}>
                Rol
              </label>
              <select
                id={idDeCampo('rol')}
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
                id={idDeCampo('horas')}
                etiqueta="Horas del trabajo"
                unidad="h"
                placeholder="Por ejemplo, 8"
                valor={estado.horas}
                alCambiar={(v) => cambiar('horas', v)}
                error={errorDeNumero(estado.horas, 'positivo')}
              />
              <CampoNumerico
                id={idDeCampo('antiguedad')}
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
              {datos.provincias.map((p, i) => (
                <label key={p.id} className={`opcion${estado.provinciaId === p.id ? ' opcion--elegida' : ''}`}>
                  <input
                    id={i === 0 ? idDeCampo('provincia') : undefined}
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
              <label className="campo__etiqueta" htmlFor={idDeCampo('categoria')}>
                Categoría de monotributo
              </label>
              <select
                id={idDeCampo('categoria')}
                className="campo__seleccion"
                value={estado.categoria}
                onChange={(e) => cambiar('categoria', e.target.value)}
              >
                {datos.monotributo.categorias.map((c) => (
                  <option key={c.letra} value={c.letra}>
                    {c.letra} · hasta {formatearPesos(c.topeAnual)} al año
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
                    aporte={(() => {
                      const elegido = estado.elegidos[exclusion.id];
                      return elegido ? aportes.get(elegido) : undefined;
                    })()}
                    tituloOculto={exclusion.nombre === grupo.nombre}
                  />
                ))}
                {/* RF-27: un grupo con subgrupos se parte en plegables; los demás, como lista. */}
                {grupo.subgrupos?.map((subgrupo) => {
                  const delSubgrupo = sueltos.filter((i) => i.subgrupo === subgrupo.id);
                  return (
                    <SubgrupoPlegable
                      key={subgrupo.id}
                      nombre={subgrupo.nombre}
                      cuenta={cuentaDelSubgrupo(delSubgrupo, estado.marcados, aportes)}
                      abiertoAlInicio={delSubgrupo.some((i) => estado.marcados[i.id])}
                    >
                      {delSubgrupo.map(itemConCasilla)}
                    </SubgrupoPlegable>
                  );
                })}
                {!grupo.subgrupos && sueltos.length > 0 && (
                  // Si el grupo también tiene opciones excluyentes, las casillas van
                  // separadas y con su subtítulo: si no, se leen como una opción más.
                  <div className={exclusiones.length > 0 ? 'items items--separados' : 'items'}>
                    {exclusiones.length > 0 && grupo.tituloDeLosItems && (
                      <h3 className="bloque__subtitulo">{grupo.tituloDeLosItems}</h3>
                    )}
                    {sueltos.map(itemConCasilla)}
                  </div>
                )}
              </section>
            );
          })}

          {/* RF-26: lo recordado se borra desde acá, al final de lo que se cargó. */}
          <div className="reinicio">
            {recuerda && (
              <p className="campo__ayuda">
                Tu rol, tus costos marcados y tu nombre quedan guardados en este navegador para la próxima vez.
              </p>
            )}
            <button type="button" className="boton boton--secundario" onClick={empezarDeNuevo}>
              Empezar de nuevo
            </button>
          </div>
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
            <DescargaDePresupuesto
              resultado={calculo.resultado}
              profesional={estado.profesional}
              alCambiarProfesional={(v) => cambiar('profesional', v)}
            />
          </div>
        )}
      </main>
      <PieDePagina datos={datos} vigencia={vigencia} />
      {/* Con la misma key que el formulario: si no, sigue observando el resultado viejo. */}
      <BarraDelTotal key={`barra-${vuelta}`} calculo={calculo} />
    </>
  );
}
