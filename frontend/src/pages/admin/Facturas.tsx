import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { clp, formatMes, estadoConfig } from "@/lib/utils";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useMes } from "@/hooks/useMes";
import { Factura, EstadoFactura } from "@/types";
import api from "@/lib/api";

interface FacturaRow extends Omit<Factura, "local"> {
  local: { id: string; codigo: string };
}

export default function Facturas() {
  const { mes, setMes } = useMes();
  const [filtroEstado, setFiltroEstado] = useState<EstadoFactura | "todos">("todos");

  const { data: facturas = [], isLoading } = useQuery<FacturaRow[]>({
    queryKey: ["facturas-lista", mes],
    queryFn: () =>
      api.get("/admin/facturas", { params: { mes } }).then((r) => r.data).catch(() => []),
  });

  const filtradas = filtroEstado === "todos"
    ? facturas
    : facturas.filter((f) => f.estado === filtroEstado);

  const estados = Object.keys(estadoConfig) as EstadoFactura[];

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink">Facturas</h1>
          <p className="text-sm text-ink-2">{formatMes(mes)}</p>
        </div>
        <input
          type="month"
          value={mes}
          onChange={(e) => setMes(e.target.value)}
          className="border border-border rounded-component px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
      </div>

      {/* Filtro estado */}
      <div className="flex gap-1 flex-wrap">
        <button
          onClick={() => setFiltroEstado("todos")}
          className={`px-3 py-1.5 rounded-component text-xs transition-colors ${filtroEstado === "todos" ? "bg-accent text-white" : "bg-paper-2 text-ink-2 hover:bg-paper"}`}
        >
          Todos ({facturas.length})
        </button>
        {estados.map((e) => {
          const count = facturas.filter((f) => f.estado === e).length;
          if (count === 0) return null;
          return (
            <button
              key={e}
              onClick={() => setFiltroEstado(e)}
              className={`px-3 py-1.5 rounded-component text-xs transition-colors ${filtroEstado === e ? "bg-accent text-white" : "bg-paper-2 text-ink-2 hover:bg-paper"}`}
            >
              {estadoConfig[e].label} ({count})
            </button>
          );
        })}
      </div>

      <div className="bg-white border border-border rounded-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-paper-2 text-xs text-ink-2 uppercase tracking-wide">
              <th className="text-left px-4 py-3">Local</th>
              <th className="text-left px-4 py-3">Folio</th>
              <th className="text-right px-4 py-3">Subtotal</th>
              <th className="text-right px-4 py-3">IVA</th>
              <th className="text-right px-4 py-3 font-bold">Total</th>
              <th className="text-center px-4 py-3">Estado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-ink-2">Cargando…</td></tr>
            )}
            {filtradas.map((f) => (
              <tr key={f.id} className="border-b border-border/60 hover:bg-paper-2/50 transition-colors">
                <td className="px-4 py-3 font-mono font-semibold text-accent text-xs">{f.local?.codigo ?? f.localId.slice(-6)}</td>
                <td className="px-4 py-3 font-mono text-xs text-ink-2">{f.folio ?? "—"}</td>
                <td className="px-4 py-3 text-right font-mono text-xs">{clp(f.subtotal)}</td>
                <td className="px-4 py-3 text-right font-mono text-xs">{clp(f.iva)}</td>
                <td className="px-4 py-3 text-right font-mono text-xs font-semibold">{clp(f.total)}</td>
                <td className="px-4 py-3 text-center"><StatusBadge estado={f.estado} /></td>
                <td className="px-4 py-3 text-right">
                  <Link to={`/admin/locales/${f.localId}`} className="text-accent hover:text-accent/70 transition-colors">
                    <ChevronRight size={16} />
                  </Link>
                </td>
              </tr>
            ))}
            {!isLoading && filtradas.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-ink-2">
                {facturas.length === 0 ? "No hay facturas generadas para este mes" : "Sin resultados para este filtro"}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
