import { useId, useState } from 'react';
import type { Resultado } from '../util/calculo/tipos.ts';
import { datos } from '../util/datos/index.ts';

interface Props {
  resultado: Resultado;
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
export default function DescargaDePresupuesto({ resultado }: Props) {
  const id = useId();
  const [profesional, setProfesional] = useState('');
  const [cliente, setCliente] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [validez, setValidez] = useState('15 días');
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState('');

  async function descargar() {
    setGenerando(true);
    setError('');
    try {
      // docx pesa: se baja recién cuando alguien pide el Word.
      const { generarPresupuesto, nombreDelArchivo } = await import('../util/presupuesto/index.ts');
      const fecha = new Date();
      const blob = await generarPresupuesto(resultado, datos, { profesional, cliente, descripcion, validez, fecha });
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = nombreDelArchivo(resultado, fecha);
      enlace.click();
      URL.revokeObjectURL(url);
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
      <p className="campo__ayuda">Lo que dejes vacío sale como un espacio para completar en el documento.</p>
      <div className="presupuesto__campos">
        <CampoDeTexto
          id={`${id}-profesional`}
          etiqueta="Tu nombre"
          valor={profesional}
          alCambiar={setProfesional}
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
      <button type="button" className="boton" onClick={descargar} disabled={generando}>
        {generando ? 'Generando…' : 'Descargar presupuesto (.docx)'}
      </button>
      {error && (
        <p className="campo__error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
