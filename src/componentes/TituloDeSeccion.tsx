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
