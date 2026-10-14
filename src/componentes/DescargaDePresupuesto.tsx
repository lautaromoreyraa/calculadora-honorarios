import { useId, useState } from 'react';
import type { Resultado } from '../util/calculo/tipos.ts';
import { datos } from '../util/datos/index.ts';
import '../estilos/presupuesto.css';

interface Props {
  resultado: Resultado;
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
      <h2 id={`${id}-titulo`}>Presupuesto en Word</h2>
      <p className="presupuesto__ayuda">
        Lo que dejes vacío sale como un espacio para completar en el documento.
      </p>
      <div className="presupuesto__campos">
        <label htmlFor={`${id}-profesional`}>Tu nombre</label>
        <input
          id={`${id}-profesional`}
          type="text"
          autoComplete="name"
          value={profesional}
          onChange={(e) => setProfesional(e.target.value)}
        />
        <label htmlFor={`${id}-cliente`}>Cliente</label>
        <input id={`${id}-cliente`} type="text" value={cliente} onChange={(e) => setCliente(e.target.value)} />
        <label htmlFor={`${id}-descripcion`}>Descripción del trabajo</label>
        <textarea
          id={`${id}-descripcion`}
          rows={3}
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
        />
        <label htmlFor={`${id}-validez`}>Validez de la oferta</label>
        <input id={`${id}-validez`} type="text" value={validez} onChange={(e) => setValidez(e.target.value)} />
      </div>
      <button type="button" className="presupuesto__boton" onClick={descargar} disabled={generando}>
        {generando ? 'Generando…' : 'Descargar presupuesto (.docx)'}
      </button>
      {error && (
        <p className="presupuesto__error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
