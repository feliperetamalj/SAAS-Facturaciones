import { useNavigate } from "react-router-dom";
import { LayoutDashboard, User, BarChart2, ArrowRight } from "lucide-react";
import { LogoBadge } from "@/components/shared/LogoBadge";

const vistas = [
  {
    id: "admin",
    label: "Administrador",
    descripcion: "Gestión completa: facturas, locales, importar Excel, conciliación de pagos y tarifas.",
    Icon: LayoutDashboard,
    iconClass: "text-accent",
    ruta: "/admin",
    color: "border-accent/30 hover:border-accent",
    badge: "Operaciones",
  },
  {
    id: "tenant",
    label: "Arrendatario",
    descripcion: "Vista del inquilino: factura del mes, desglose de cargos e historial de pagos.",
    Icon: User,
    iconClass: "text-ok",
    ruta: "/tenant",
    color: "border-ok/30 hover:border-ok",
    badge: "Portal inquilino",
  },
  {
    id: "board",
    label: "Junta Directiva",
    descripcion: "Dashboard ejecutivo: KPIs globales, mapa de ocupación y ranking de ingresos.",
    Icon: BarChart2,
    iconClass: "text-warn",
    ruta: "/board",
    color: "border-warn/30 hover:border-warn",
    badge: "Solo lectura",
  },
];

export default function ViewSelector() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-paper flex flex-col items-center justify-center p-6">
      <div className="text-center mb-10">
        <LogoBadge size="lg" />
        <h1 className="text-2xl font-bold text-ink mt-4">Alto Las Rastras</h1>
        <p className="text-sm text-ink-2 mt-1">Sistema de Facturación · Proof of Concept</p>
      </div>

      <p className="text-sm text-ink-2 mb-6">Elige la vista que quieres explorar</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full max-w-3xl">
        {vistas.map(({ id, label, descripcion, Icon, iconClass, ruta, color, badge }) => (
          <button
            key={id}
            onClick={() => navigate(ruta)}
            className={`bg-white border-2 rounded-card p-6 text-left transition-all duration-150 group shadow-sm hover:shadow-md ${color}`}
          >
            <div className="flex items-start justify-between mb-4">
              <Icon size={32} className={iconClass} />
              <span className="text-xs font-medium text-ink-2 bg-paper-2 px-2 py-1 rounded-full">
                {badge}
              </span>
            </div>
            <h2 className="text-base font-semibold text-ink mb-2">{label}</h2>
            <p className="text-sm text-ink-2 leading-relaxed mb-4">{descripcion}</p>
            <div className="flex items-center gap-1 text-xs font-medium text-accent opacity-0 group-hover:opacity-100 transition-opacity">
              Entrar <ArrowRight size={13} />
            </div>
          </button>
        ))}
      </div>

      <p className="text-xs text-ink-2/60 mt-10">POC · Sin autenticación · Datos de prueba</p>
    </div>
  );
}
