import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { CheckCircle, AlertTriangle, Zap, Send, ChevronRight } from "lucide-react";
import { clp, formatMes } from "@/lib/utils";
import { useMes } from "@/hooks/useMes";
import api from "@/lib/api";

interface PreviewLocal {
  local: { id: string; codigo: string; m2: number; estado: string };
  arrendatario: { razonSocial: string; email: string } | null;
  resultado: { subtotal: number; ivaAmount: number; total: number };
  alertas: { sinLuz: boolean; sinAgua: boolean; anomaliaLuz: boolean; anomaliaAgua: boolean; tieneMultas: boolean };
}

interface Preview {
  mes: string;
  tarifa: { valorUf: number; precioKwh: number; precioM3Agua: number } | null;
  totalFacturas: number;
  totalBruto: number;
  ivaTotal: number;
  alertas: { sinLecturaLuz: number; sinLecturaAgua: number };
  locales: PreviewLocal[];
}

type Paso = "revisar" | "confirmar" | "listo";

export default function GenerarLote() {
  const { mes, setMes } = useMes();
  const [paso, setPaso] = useState<Paso>("revisar");
  const [resultadoEnvio, setResultadoEnvio] = useState<{ enviadas: number; errores: string[] } | null>(null);

  const { data: preview, isLoading } = useQuery<Preview>({
    queryKey: ["preview", mes],
    queryFn: () => api.get(`/admin/ciclo/${mes}/preview`).then((r) => r.data),
    enabled: paso === "revisar",
  });

  const generarMutation = useMutation({
    mutationFn: () => api.post(`/admin/ciclo/${mes}/generar`).then((r) => r.data),
    onSuccess: () => setPaso("listo"),
  });

  const enviarMutation = useMutation({
    mutationFn: () => api.post(`/admin/ciclo/${mes}/enviar`).then((r) => r.data),
    onSuccess: (data) => setResultadoEnvio(data),
  });

  const hayAlertas =
    (preview?.alertas.sinLecturaLuz ?? 0) > 0 || (preview?.alertas.sinLecturaAgua ?? 0) > 0;

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink">Generar lote de facturas</h1>
          <p className="text-sm text-ink-2">Ciclo mensual — {formatMes(mes)}</p>
        </div>
        <input
          type="month"
          value={mes}
          onChange={(e) => { setMes(e.target.value); setPaso("revisar"); }}
          className="border border-border rounded-component px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2 text-sm">
        {(["revisar", "confirmar", "listo"] as Paso[]).map((p, i) => (
          <div key={p} className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${paso === p ? "bg-accent text-white" : ["listo"].includes(paso) && i < ["revisar","confirmar","listo"].indexOf(paso) ? "bg-ok text-white" : "bg-paper-2 text-ink-2"}`}>
              {i + 1}
            </div>
            <span className={paso === p ? "text-ink font-medium" : "text-ink-2"}>
              {p === "revisar" ? "Revisar" : p === "confirmar" ? "Confirmar" : "Listo"}
            </span>
            {i < 2 && <ChevronRight size={14} className="text-ink-2" />}
          </div>
        ))}
      </div>

      {/* Paso 1: Revisar */}
      {paso === "revisar" && (
        <div className="space-y-4">
          {isLoading && <p className="text-sm text-ink-2">Calculando preview…</p>}

          {preview && (
            <>
              {/* Resumen */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-white border border-border rounded-card p-4">
                  <p className="text-xs text-ink-2 uppercase tracking-wide mb-1">Facturas a generar</p>
                  <p className="font-mono text-2xl font-bold text-ink">{preview.totalFacturas}</p>
                </div>
                <div className="bg-white border border-border rounded-card p-4">
                  <p className="text-xs text-ink-2 uppercase tracking-wide mb-1">Total bruto</p>
                  <p className="font-mono text-xl font-bold text-accent">{clp(preview.totalBruto)}</p>
                </div>
                <div className="bg-white border border-border rounded-card p-4">
                  <p className="text-xs text-ink-2 uppercase tracking-wide mb-1">IVA total</p>
                  <p className="font-mono text-xl font-bold text-ink">{clp(preview.ivaTotal)}</p>
                </div>
                <div className="bg-white border border-border rounded-card p-4">
                  <p className="text-xs text-ink-2 uppercase tracking-wide mb-1">UF del mes</p>
                  <p className="font-mono text-xl font-bold text-ink">{preview.tarifa ? clp(preview.tarifa.valorUf) : "—"}</p>
                </div>
              </div>

              {/* Alertas */}
              {hayAlertas && (
                <div className="bg-warn-soft border border-warn/30 rounded-card p-4 space-y-1">
                  <p className="text-sm font-semibold text-warn flex items-center gap-2"><AlertTriangle size={16} /> Atención antes de generar</p>
                  {preview.alertas.sinLecturaLuz > 0 && <p className="text-xs text-ink">{preview.alertas.sinLecturaLuz} locales sin lectura de luz — se generará con 0 kWh</p>}
                  {preview.alertas.sinLecturaAgua > 0 && <p className="text-xs text-ink">{preview.alertas.sinLecturaAgua} locales sin lectura de agua — se generará con 0 m³</p>}
                </div>
              )}

              {/* Tabla preview */}
              <div className="bg-white border border-border rounded-card overflow-hidden">
                <div className="px-4 py-3 border-b border-border bg-paper-2">
                  <p className="text-xs font-medium text-ink-2 uppercase tracking-wide">Detalle por local</p>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-paper-2 sticky top-0">
                      <tr>
                        <th className="text-left px-4 py-2">Local</th>
                        <th className="text-left px-4 py-2">Arrendatario</th>
                        <th className="text-right px-4 py-2">Subtotal</th>
                        <th className="text-right px-4 py-2 font-bold">Total c/IVA</th>
                        <th className="px-4 py-2 text-center">Alertas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.locales.map((l) => (
                        <tr key={l.local.id} className="border-t border-border/60">
                          <td className="px-4 py-2 font-mono font-medium text-accent">{l.local.codigo}</td>
                          <td className="px-4 py-2 text-ink-2">{l.arrendatario?.razonSocial ?? <span className="italic">Sin arrendatario</span>}</td>
                          <td className="px-4 py-2 text-right font-mono">{clp(l.resultado.subtotal)}</td>
                          <td className="px-4 py-2 text-right font-mono font-semibold">{clp(l.resultado.total)}</td>
                          <td className="px-4 py-2 text-center">
                            {(l.alertas.sinLuz || l.alertas.sinAgua || l.alertas.anomaliaLuz || l.alertas.anomaliaAgua) && (
                              <AlertTriangle size={12} className="text-warn mx-auto" />
                            )}
                            {l.alertas.tieneMultas && <span className="text-red-500 text-xs ml-1">M</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <button
                onClick={() => setPaso("confirmar")}
                className="bg-accent hover:bg-accent/90 text-white font-medium px-6 py-2 rounded-component text-sm transition-colors flex items-center gap-2"
              >
                <Zap size={16} /> Continuar y confirmar
              </button>
            </>
          )}
        </div>
      )}

      {/* Paso 2: Confirmar */}
      {paso === "confirmar" && preview && (
        <div className="bg-white border border-border rounded-card p-6 space-y-5 max-w-lg">
          <h2 className="font-semibold text-ink">Confirmar generación del lote</h2>
          <p className="text-sm text-ink-2">
            Se generarán <strong>{preview.totalFacturas} facturas</strong> por un total de{" "}
            <strong className="text-accent">{clp(preview.totalBruto)}</strong> (IVA incluido) para el mes de{" "}
            <strong>{formatMes(mes)}</strong>.
          </p>
          <p className="text-xs text-warn font-medium flex items-center gap-1">
            <AlertTriangle size={13} /> Esta acción no se puede deshacer salvo anulando individualmente.
          </p>

          {generarMutation.isError && (
            <div className="bg-red-50 border border-red-200 rounded-component p-3 text-sm text-red-600">
              {(generarMutation.error as Error).message}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setPaso("revisar")}
              className="border border-border rounded-component px-4 py-2 text-sm text-ink-2 hover:bg-paper-2 transition-colors"
            >
              Volver
            </button>
            <button
              onClick={() => generarMutation.mutate()}
              disabled={generarMutation.isPending}
              className="flex-1 bg-accent hover:bg-accent/90 disabled:opacity-60 text-white font-medium py-2 rounded-component text-sm transition-colors flex items-center justify-center gap-2"
            >
              <Zap size={16} />
              {generarMutation.isPending ? "Generando…" : "Generar lote"}
            </button>
          </div>
        </div>
      )}

      {/* Paso 3: Listo */}
      {paso === "listo" && (
        <div className="bg-white border border-border rounded-card p-6 space-y-5 max-w-lg">
          <div className="flex items-center gap-3">
            <CheckCircle size={32} className="text-ok" />
            <div>
              <h2 className="font-semibold text-ink">Lote generado correctamente</h2>
              <p className="text-sm text-ink-2">{preview?.totalFacturas} facturas para {formatMes(mes)}</p>
            </div>
          </div>

          {!resultadoEnvio ? (
            <div>
              <p className="text-sm text-ink-2 mb-3">¿Deseas enviar las facturas por email ahora?</p>
              <button
                onClick={() => enviarMutation.mutate()}
                disabled={enviarMutation.isPending}
                className="bg-accent hover:bg-accent/90 disabled:opacity-60 text-white font-medium px-5 py-2 rounded-component text-sm transition-colors flex items-center gap-2"
              >
                <Send size={16} />
                {enviarMutation.isPending ? "Enviando…" : "Enviar por email"}
              </button>
            </div>
          ) : (
            <div className="bg-ok-soft border border-ok/30 rounded-component p-4 space-y-1">
              <p className="text-sm font-semibold text-ok flex items-center gap-2"><Send size={14} /> Emails enviados</p>
              <p className="text-xs text-ink">{resultadoEnvio.enviadas} facturas enviadas</p>
              {resultadoEnvio.errores.length > 0 && (
                <p className="text-xs text-warn">{resultadoEnvio.errores.length} errores — revisa la conciliación</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
