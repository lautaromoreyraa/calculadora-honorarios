import { useId, useMemo, useState } from 'react';
import type { Resultado } from '../util/calculo/tipos.ts';
import { datos } from '../util/datos/index.ts';
import { useFormato } from '../contexto/Moneda.tsx';
import { almacenDelNavegador, guardarUltimoNumero, leerUltimoNumero } from '../util/memoria.ts';
import { contenidoDelPresupuesto, LEYENDA_FACTURA_C, siguienteNumero } from '../util/presupuesto/contenido.ts';
import { fechaDentroDe } from '../util/presupuesto/fechas.ts';
import { TituloDeSeccion } from './TituloDeSeccion.tsx';
import { VistaPreviaDelPresupuesto } from './VistaPreviaDelPresupuesto.tsx';

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
  tipo?: 'text' | 'date' | 'email' | 'tel';
  min?: string;
  ayuda?: string;
}

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
      {ayuda && (
        <p className="campo__ayuda" id={`${id}-ayuda`}>
          {ayuda}
        </p>
      )}
    </div>
  );
}

export default function DescargaDePresupuesto({ resultado, delProfesional, alCambiar }: Props) {
  const id = useId();
  const formato = useFormato();
  const [numero, setNumero] = useState(() =>
    siguienteNumero(leerUltimoNumero(almacenDelNavegador()), new Date().getFullYear()),
  );
  const [empresa, setEmpresa] = useState('');
  const [contacto, setContacto] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [validez, setValidez] = useState(() => fechaDentroDe(15));
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState('');
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
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = archivo;
      enlace.hidden = true;
      document.body.append(enlace);
      enlace.click();
      enlace.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
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

        <p className="presupuesto__total">
          Total a presupuestar: <strong>{formato.monto(resultado.total)}</strong>
        </p>
        <button type="button" className="boton" onClick={descargar} disabled={generando}>
          {generando ? 'Generando…' : 'Descargar presupuesto (.docx)'}
        </button>
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
