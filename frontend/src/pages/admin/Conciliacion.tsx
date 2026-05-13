import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, XCircle, AlertTriangle, RefreshCw } from "lucide-react";
import { clp, formatFecha } from "@/lib/utils";
import api from "@/lib/api";

interface Comprobante {
  id: string;
  rutDetectado?: string;
  montoDetectado?: number;
  fechaDetectada?: string;
  recibidoAt: string;
  estado: string;
  sugerencia?: {
    facturaId: string;
    modoMatch: "exacto" | "tolerancia";
    factura: { id: string; total: number; mes: string; estado: string };
  } | null;
}

interface Cola {
  stats: { total: number; autoMatch: number; sinMatch: number };
  cola: Comprobante[];
}

export default function Conciliacion() {
  const qc = useQueryClient();

  const { data, isLoading, refetch } = useQuery<Cola>({
    queryKey: ["conciliacion"],
    queryFn: () => api.get("/admin/conciliacion/cola").then((r) => r.data),
    refetchInterval: 30000,
  });

  const aprobarMutation = useMutation({
    mutationFn: ({ id, facturaId, monto }: { id: string; facturaId: string; monto?: number }) =>
      api.post(`/admin/conciliacion/${id}/aprobar`, { facturaId, monto }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["conciliacion"] }),
  });

  const rechazarMutation = useMutation({
    mutationFn: (id: string) => api.post(`/admin/conciliacion/${id}/rechazar`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["conciliacion"] }),
  });

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink">Conciliación de pagos</h1>
          <p className="text-sm text-ink-2">Bandeja de comprobantes entrantes</p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 border border-border rounded-component px-3 py-1.5 text-xs text-ink-2 hover:bg-paper-2 transition-colors"
        >
          <RefreshCw size={13} /> Actualizar
        </button>
      </div>

      {/* Stats */}
      {data && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white border border-border rounded-card p-4 text-center">
            <p className="text-2xl font-bold font-mono text-ink">{data.stats.total}</p>
            <p className="text-xs text-ink-2 mt-1">Pendientes</p>
          </div>
          <div className="bg-ok-soft border border-ok/30 rounded-card p-4 text-center">
            <p className="text-2xl font-bold font-mono text-ok">{data.stats.autoMatch}</p>
            <p className="text-xs text-ink-2 mt-1">Con match automático</p>
          </div>
          <div className="bg-warn-soft border border-warn/30 rounded-card p-4 text-center">
            <p className="text-2xl font-bold font-mono text-warn">{data.stats.sinMatch}</p>
            <p className="text-xs text-ink-2 mt-1">Sin match — revisar</p>
          </div>
        </div>
      )}

      {isLoading && <p className="text-sm text-ink-2">Cargando bandeja…</p>}

      {/* Lista comprobantes */}
      <div className="space-y-3">
        {data?.cola.map((comp) => (
          <div
            key={comp.id}
            className={`bg-white border rounded-card p-4 space-y-3 ${comp.sugerencia ? "border-ok/30" : "border-warn/30"}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                {comp.sugerencia ? (
                  <CheckCircle size={16} className="text-ok shrink-0" />
                ) : (
                  <AlertTriangle size={16} className="text-warn shrink-0" />
                )}
                <div>
                  <p className="text-sm font-medium text-ink">
                    RUT: <span className="font-mono">{comp.rutDetectado ?? "No detectado"}</span>
                    {comp.montoDetectado && (
                      <span className="ml-3 text-accent font-mono">{clp(comp.montoDetectado)}</span>
                    )}
                  </p>
                  <p className="text-xs text-ink-2">
                    Recibido: {formatFecha(comp.recibidoAt)}
                    {comp.fechaDetectada && ` · Fecha pago: ${formatFecha(comp.fechaDetectada)}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {comp.sugerencia && (
                  <button
                    onClick={() => aprobarMutation.mutate({ id: comp.id, facturaId: comp.sugerencia!.facturaId })}
                    disabled={aprobarMutation.isPending}
                    className="flex items-center gap-1 bg-ok hover:bg-ok/90 disabled:opacity-60 text-white px-3 py-1.5 rounded-component text-xs font-medium transition-colors"
                  >
                    <CheckCircle size={12} /> Conciliar
                  </button>
                )}
                <button
                  onClick={() => rechazarMutation.mutate(comp.id)}
                  className="flex items-center gap-1 border border-border hover:border-warn/50 text-ink-2 hover:text-warn px-3 py-1.5 rounded-component text-xs font-medium transition-colors"
                >
                  <XCircle size={12} /> Rechazar
                </button>
              </div>
            </div>

            {comp.sugerencia && (
              <div className="bg-ok-soft/40 border border-ok/20 rounded-component px-3 py-2 text-xs flex items-center gap-2">
                <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${comp.sugerencia.modoMatch === "exacto" ? "bg-ok text-white" : "bg-accent text-white"}`}>
                  {comp.sugerencia.modoMatch === "exacto" ? "Match exacto" : "Tolerancia ±"}
                </span>
                <span className="text-ink">
                  Factura {comp.sugerencia.factura.mes} · {clp(comp.sugerencia.factura.total)}
                </span>
              </div>
            )}

            {!comp.sugerencia && (
              <p className="text-xs text-warn-soft bg-warn-soft/50 border border-warn/20 rounded-component px-3 py-2">
                Sin factura abierta que coincida. Revisa RUT y monto manualmente.
              </p>
            )}
          </div>
        ))}

        {!isLoading && data?.cola.length === 0 && (
          <div className="bg-white border border-border rounded-card p-8 text-center">
            <CheckCircle size={32} className="text-ok mx-auto mb-2" />
            <p className="text-sm font-medium text-ink">Bandeja al día</p>
            <p className="text-xs text-ink-2">No hay comprobantes pendientes de conciliar</p>
          </div>
        )}
      </div>
    </div>
  );
}
