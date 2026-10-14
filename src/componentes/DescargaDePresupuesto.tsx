import { useId, useState } from 'react';
import type { Resultado } from '../util/calculo/tipos.ts';
import { datos } from '../util/datos/index.ts';
import { formatearPesos } from '../util/formato.ts';

interface Props {
  resultado: Resultado;
  /** El nombre se recuerda entre visitas (RF-26): lo guarda la calculadora, no este formulario. */
  profesional: string;
  alCambiarProfesional: (valor: string) => void;
}

interface CampoDeTextoProps {
  id: string;
  etiqueta: string;
  valor: string;
  alCambiar: (valor: string) => void;
  autoComplete?: string;
  multilinea?: boolean;
}

/** Campo de texto con los mismos estilos que los numéricos del formulario. */
function CampoDeTexto({ id, etiqueta, valor, alCambiar, autoComplete = 'off', multilinea }: CampoDeTextoProps) {
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
            value={valor}
            onChange={(e) => alCambiar(e.target.value)}
          />
        ) : (
          <input
            id={id}
            className="campo__entrada"
            type="text"
            autoComplete={autoComplete}
            value={valor}
            onChange={(e) => alCambiar(e.target.value)}
          />
        )}
      </div>
    </div>
  );
}

/**
 * Campos del presupuesto y botón de descarga (RF-16). Todo se genera en el
 * navegador: nada de lo que se carga acá sale del equipo (RNF-02).
 */
export default function DescargaDePresupuesto({ resultado, profesional, alCambiarProfesional }: Props) {
  const id = useId();
  const [cliente, setCliente] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [validez, setValidez] = useState('15 días');
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState('');
  /** Nombre del último archivo descargado: en el celular la descarga del navegador se pierde fácil. */
  const [descargado, setDescargado] = useState('');

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
      const blob = await modulo.generarPresupuesto(resultado, datos, { profesional, cliente, descripcion, validez, fecha });
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
      setDescargado(archivo);
    } catch {
      setError('No se pudo generar el presupuesto. Probá de nuevo.');
    } finally {
      setGenerando(false);
    }
  }

  return (
    <section className="presupuesto" aria-labelledby={`${id}-titulo`}>
      <h2 className="bloque__titulo" id={`${id}-titulo`}>
        Presupuesto en Word
      </h2>
      <p className="campo__ayuda">
        Lleva el trabajo y el total, sin el desglose de tus costos. Lo que dejes vacío sale como un espacio para
        completar.
      </p>
      <div className="presupuesto__campos">
        <CampoDeTexto
          id={`${id}-profesional`}
          etiqueta="Tu nombre"
          valor={profesional}
          alCambiar={alCambiarProfesional}
          autoComplete="name"
        />
        <CampoDeTexto id={`${id}-cliente`} etiqueta="Cliente" valor={cliente} alCambiar={setCliente} />
        <CampoDeTexto
          id={`${id}-descripcion`}
          etiqueta="Descripción del trabajo"
          valor={descripcion}
          alCambiar={setDescripcion}
          multilinea
        />
        <CampoDeTexto id={`${id}-validez`} etiqueta="Validez de la oferta" valor={validez} alCambiar={setValidez} />
      </div>
      {/* El total a la vista junto al botón: en escritorio, al llegar acá el panel
          del resultado ya quedó arriba. */}
      <p className="presupuesto__total">
        Total a presupuestar: <strong>{formatearPesos(resultado.total)}</strong>
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
    </section>
  );
}
