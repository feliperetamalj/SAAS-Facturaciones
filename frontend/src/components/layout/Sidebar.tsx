import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, FileText, Upload, Zap, Settings,
  CreditCard, Users, Building2, ArrowLeft, FilePlus2
} from "lucide-react";
import { LogoBadge } from "@/components/shared/LogoBadge";

const adminNav = [
  { label: "Dashboard",       to: "/admin",              icon: <LayoutDashboard size={18} />, end: true },
  { label: "Importar Excel",  to: "/admin/importar",     icon: <Upload size={18} /> },
  { label: "Generar lote",    to: "/admin/generar",      icon: <Zap size={18} /> },
  { label: "Facturas",        to: "/admin/facturas",     icon: <FileText size={18} /> },
  { label: "Conciliación",    to: "/admin/conciliacion", icon: <CreditCard size={18} /> },
  { label: "Añadir locales",   to: "/admin/importar-locales", icon: <FilePlus2 size={18} /> },
  { label: "Locales",         to: "/admin/locales",      icon: <Building2 size={18} /> },
  { label: "Arrendatarios",   to: "/admin/arrendatarios",icon: <Users size={18} /> },
  { label: "Tarifas",         to: "/admin/tarifas",      icon: <Settings size={18} /> },
];

const boardNav = [
  { label: "Resumen ejecutivo", to: "/board", icon: <LayoutDashboard size={18} />, end: true },
];

const vistaConfig: Record<string, { nav: typeof adminNav; label: string }> = {
  board: { nav: boardNav, label: "Junta Directiva" },
  admin: { nav: adminNav, label: "Administrador" },
};

export function Sidebar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const key = pathname.startsWith("/board") ? "board" : "admin";
  const { nav, label } = vistaConfig[key];

  return (
    <aside className="w-[220px] min-h-screen bg-white border-r border-border flex flex-col shrink-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-border">
        <div className="flex items-center gap-2">
          <LogoBadge size="md" />
          <div>
            <p className="text-sm font-semibold text-ink leading-tight">Alto Las Rastras</p>
            <p className="text-xs text-ink-2">Facturación</p>
          </div>
        </div>
      </div>

      {/* Badge vista actual */}
      <div className="px-4 py-2 border-b border-border bg-paper">
        <span className="text-xs text-ink-2">Vista: <strong className="text-ink">{label}</strong></span>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-component text-sm transition-colors ${
                isActive
                  ? "bg-accent-soft text-accent font-medium"
                  : "text-ink-2 hover:bg-paper-2 hover:text-ink"
              }`
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Volver al selector */}
      <div className="p-4 border-t border-border">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-component text-xs text-ink-2 hover:bg-paper-2 hover:text-accent transition-colors"
        >
          <ArrowLeft size={14} /> Cambiar vista
        </button>
      </div>
    </aside>
  );
}
