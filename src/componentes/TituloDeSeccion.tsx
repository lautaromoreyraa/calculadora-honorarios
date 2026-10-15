import {
  Award,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  FileText,
  Landmark,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

/**
 * Un ícono por sección (RNF-13), todos de Lucide, con el mismo trazo. Viven
 * acá y no en los datos: son de la interfaz, y una sección nueva sin ícono
 * sale igual, con el genérico.
 */
const ICONOS: Record<string, LucideIcon> = {
  trabajo: BriefcaseBusiness,
  cliente: Building2,
  contenidos: CalendarClock,
  convencionales: Award,
  fiscales: Landmark,
  operativos: Wallet,
  presupuesto: FileText,
};

interface Props {
  seccion: string;
  id: string;
  children: string;
  /** El título de «El trabajo» recibe el foco al empezar de nuevo. */
  enfocable?: boolean;
}

export function TituloDeSeccion({ seccion, id, children, enfocable }: Props) {
  const Icono = ICONOS[seccion] ?? FileText;
  return (
    <div className="bloque__encabezado">
      <span className="bloque__icono" aria-hidden="true">
        <Icono size={20} strokeWidth={1.75} />
      </span>
      <h2 className="bloque__titulo" id={id} tabIndex={enfocable ? -1 : undefined}>
        {children}
      </h2>
    </div>
  );
}
