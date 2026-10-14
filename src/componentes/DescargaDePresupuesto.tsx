import { useId, useMemo, useState } from 'react';
import type { Resultado } from '../util/calculo/tipos.ts';
import { datos } from '../util/datos/index.ts';
import { useFormato } from '../contexto/Moneda.tsx';
import { almacenDelNavegador, guardarUltimoNumero, leerUltimoNumero } from '../util/memoria.ts';
import { contenidoDelPresupuesto, LEYENDA_FACTURA_C, siguienteNumero } from '../util/presupuesto/contenido.ts';
import { fechaDentroDe } from '../util/presupuesto/fechas.ts';
import { TituloDeSeccion } from './TituloDeSeccion.tsx';
import { VistaPreviaDelPresupuesto } from './VistaPreviaDelPresupuesto.tsx';

/** Lo del profesional que se recuerda entre visitas (RF-26): lo guarda la calculadora, no este formulario. */
export interface DelProfesional {
  profesional: string;
  email: string;
  telefono: string;
  cuit: string;
  condiciones: string;
}

interface Props {
  resultado: Resultado;
  delProfesional: DelProfesional;
  alCambiar: (campo: keyof DelProfesional, valor: string) => void;
}

interface CampoDeTextoProps {
  id: string;
  etiqueta: string;
  valor: string;
  alCambiar: (valor: string) => void;
  autoComplete?: string;
  multilinea?: boolean;
  /** «date» muestra el calendario del sistema. */
  tipo?: 'text' | 'date' | 'email' | 'tel';
  min?: string;
  ayuda?: string;
}

/** Campo de texto con los mismos estilos que los numéricos del formulario. */
function CampoDeTexto({
  id,
  etiqueta,
  valor,
  alCambiar,
  autoComplete = 'off',
  multilinea,
  tipo = 'text',
  min,
  ayuda,
}: CampoDeTextoProps) {
  return (
    <div className="campo">
      <label className="campo__etiqueta" htmlFor={id}>
        {etiqueta}
      </label>
      <div className="campo__control">
        {multilinea ? (
          <textarea
            id={id}
            className="campo__entrada campo__entrada--multilinea"
            rows={3}
            aria-describedby={ayuda ? `${id}-ayuda` : undefined}
            value={valor}
            onChange={(e) => alCambiar(e.target.value)}
          />
        ) : (
          <input
            id={id}
            className="campo__entrada"
            type={tipo}
            min={min}
            autoComplete={autoComplete}
            aria-describedby={ayuda ? `${id}-ayuda` : undefined}
            value={valor}
            onChange={(e) => alCambiar(e.target.value)}
          />
        )}
      </div>
      {/* Debajo del campo, como en el resto del formulario: arriba empujaba el
          campo y lo desalineaba del de al lado. */}
      {ayuda && (
        <p className="campo__ayuda" id={`${id}-ayuda`}>
          {ayuda}
        </p>
      )}
    </div>
  );
}

/**
 * Campos del presupuesto, vista previa y botón de descarga (RF-16). Todo se
 * genera en el navegador: nada de lo que se carga acá sale del equipo (RNF-02).
 */
export default function DescargaDePresupuesto({ resultado, delProfesional, alCambiar }: Props) {
  const id = useId();
  const formato = useFormato();
  // El siguiente al último descargado en este navegador; se puede cambiar.
  const [numero, setNumero] = useState(() =>
    siguienteNumero(leerUltimoNumero(almacenDelNavegador()), new Date().getFullYear()),
  );
  const [empresa, setEmpresa] = useState('');
  const [contacto, setContacto] = useState('');
  const [descripcion, setDescripcion] = useState('');
  // La validez es una fecha: el cliente lee «hasta el 29 de octubre», no «15 días» desde quién sabe cuándo.
  const [validez, setValidez] = useState(() => fechaDentroDe(15));
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState('');
  /** Nombre del último archivo descargado: en el celular la descarga del navegador se pierde fácil. */
  const [descargado, setDescargado] = useState('');

  const presupuesto = useMemo(
    () => ({ ...delProfesional, numero, empresa, contacto, descripcion, validez }),
    [delProfesional, numero, empresa, contacto, descripcion, validez],
  );
  const contenido = useMemo(() => contenidoDelPresupuesto(resultado, datos, presupuesto), [resultado, presupuesto]);

  async function descargar() {
    setGenerando(true);
    setError('');
    setDescargado('');
    try {
      // docx pesa: se baja recién cuando alguien pide el Word. Si se publicó una
      // versión nueva con la página abierta, ese archivo ya no existe con el
      // nombre que esta página conoce: se pide recargar en vez de fallar mudo.
      let modulo: typeof import('../util/presupuesto/index.ts');
      try {
        modulo = await import('../util/presupuesto/index.ts');
      } catch {
        setError('Hay una versión nueva de la calculadora. Recargá la página para descargar el presupuesto.');
        return;
      }
      const fecha = new Date();
      const blob = await modulo.generarPresupuesto(resultado, datos, { ...presupuesto, fecha });
      const url = URL.createObjectURL(blob);
      const archivo = modulo.nombreDelArchivo(resultado, fecha);
      // En el documento y revocado más tarde: un enlace suelto, o revocar la URL
      // en el mismo instante, cancela la descarga en algunos navegadores.
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = archivo;
      enlace.hidden = true;
      document.body.append(enlace);
      enlace.click();
      enlace.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      // El número queda en el campo, por si hay que corregir algo y volver a
      // bajarlo; el próximo presupuesto ya propone el siguiente.
      guardarUltimoNumero(almacenDelNavegador(), numero);
      setDescargado(archivo);
    } catch {
      setError('No se pudo generar el presupuesto. Probá de nuevo.');
    } finally {
      setGenerando(false);
    }
  }

  const campo = (sufijo: string) => `${id}-${sufijo}`;

  return (
    <section className="presupuesto" aria-labelledby={campo('titulo')}>
      <div className="presupuesto__formulario">
        <TituloDeSeccion seccion="presupuesto" id={campo('titulo')}>
          Presupuesto en Word
        </TituloDeSeccion>
        <p className="campo__ayuda">
          Lleva el trabajo y el total, sin el desglose de tus costos. Lo que falte sale como un espacio para
          completar. Tus datos y tus condiciones quedan guardados para la próxima.
        </p>

        <fieldset className="presupuesto__grupo">
          <legend className="presupuesto__leyenda">Tus datos</legend>
          <CampoDeTexto
            id={campo('profesional')}
            etiqueta="Tu nombre"
            valor={delProfesional.profesional}
            alCambiar={(v) => alCambiar('profesional', v)}
            autoComplete="name"
          />
          <CampoDeTexto
            id={campo('email')}
            etiqueta="Email"
            tipo="email"
            valor={delProfesional.email}
            alCambiar={(v) => alCambiar('email', v)}
            autoComplete="email"
          />
          <CampoDeTexto
            id={campo('telefono')}
            etiqueta="Teléfono"
            tipo="tel"
            valor={delProfesional.telefono}
            alCambiar={(v) => alCambiar('telefono', v)}
            autoComplete="tel"
          />
          <CampoDeTexto
            id={campo('cuit')}
            etiqueta="CUIT (opcional)"
            valor={delProfesional.cuit}
            alCambiar={(v) => alCambiar('cuit', v)}
          />
        </fieldset>

        <fieldset className="presupuesto__grupo">
          <legend className="presupuesto__leyenda">Cliente</legend>
          <CampoDeTexto
            id={campo('empresa')}
            etiqueta="Empresa u organización"
            valor={empresa}
            alCambiar={setEmpresa}
            autoComplete="organization"
          />
          <CampoDeTexto id={campo('contacto')} etiqueta="Persona de contacto" valor={contacto} alCambiar={setContacto} />
        </fieldset>

        <fieldset className="presupuesto__grupo">
          <legend className="presupuesto__leyenda">Trabajo</legend>
          <CampoDeTexto
            id={campo('descripcion')}
            etiqueta="Descripción del trabajo"
            valor={descripcion}
            alCambiar={setDescripcion}
            multilinea
          />
          <CampoDeTexto
            id={campo('numero')}
            etiqueta="N.º de presupuesto"
            valor={numero}
            alCambiar={setNumero}
            ayuda="Sigue al último que descargaste."
          />
          <CampoDeTexto
            id={campo('validez')}
            etiqueta="Validez de la oferta"
            tipo="date"
            min={fechaDentroDe(0)}
            valor={validez}
            alCambiar={setValidez}
          />
        </fieldset>

        <fieldset className="presupuesto__grupo presupuesto__grupo--una-columna">
          <legend className="presupuesto__leyenda">Condiciones de pago</legend>
          <CampoDeTexto
            id={campo('condiciones')}
            etiqueta="Anticipo, forma de pago y plazo"
            valor={delProfesional.condiciones}
            alCambiar={(v) => alCambiar('condiciones', v)}
            multilinea
            ayuda={
              contenido.condiciones.includes(LEYENDA_FACTURA_C)
                ? 'Como sumaste el monotributo, el presupuesto agrega que es factura C.'
                : undefined
            }
          />
        </fieldset>

        {/* El total a la vista junto al botón: en escritorio, al llegar acá el panel
            del resultado ya quedó arriba. */}
        <p className="presupuesto__total">
          Total a presupuestar: <strong>{formato.monto(resultado.total)}</strong>
        </p>
        <button type="button" className="boton" onClick={descargar} disabled={generando}>
          {generando ? 'Generando…' : 'Descargar presupuesto (.docx)'}
        </button>
        {/* Queda hasta la próxima descarga: no desaparece sola. */}
        <p className="presupuesto__listo" role="status">
          {descargado && `Presupuesto descargado: ${descargado}`}
        </p>
        {error && (
          <p className="campo__error" role="alert">
            {error}
          </p>
        )}
      </div>

      <VistaPreviaDelPresupuesto contenido={contenido} />
    </section>
  );
}
