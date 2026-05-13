import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Save, Calculator, RefreshCw } from "lucide-react";
import { clp } from "@/lib/utils";
import { useMes } from "@/hooks/useMes";
import { Tarifa } from "@/types";
import api from "@/lib/api";

interface TarifaCategoria {
  id: string;
  categoria: string;
  ufM2Arriendo: number;
  ufM2Gc: number;
}

const CATEGORIAS = [
  { key: "BOULEVARD_A",   label: "Boulevard A" },
  { key: "BOULEVARD_B",   label: "Boulevard B" },
  { key: "PATIO_COMIDAS", label: "Patio Comidas" },
  { key: "SUBTERRANEO",   label: "Subterráneo" },
  { key: "SERVICIOS",     label: "Servicios" },
];

export default function Tarifas() {
  const { mes, setMes } = useMes();
  const qc = useQueryClient();

  const { data } = useQuery<{ tarifa: Tarifa | null; categorias: TarifaCategoria[] }>({
    queryKey: ["tarifas", mes],
    queryFn: () => api.get(`/admin/tarifas?mes=${mes}`).then((r) => r.data),
  });

  const tarifa = data?.tarifa;
  const categorias = data?.categorias ?? [];

  const [form, setForm] = useState({ iva: "0.19", precioKwh: "", precioM3Agua: "", toleranciaPago: "1000" });
  const [ufSincronizada, setUfSincronizada] = useState<{ valor: number; fecha: string } | null>(null);
  const [sincronizando, setSincronizando] = useState(false);

  const efectiva = tarifa ?? {
    valorUf: 37500, iva: 0.19, precioKwh: 125, precioM3Agua: 2600, toleranciaPago: 1000,
  };

  const ufVal = ufSincronizada?.valor ?? efectiva.valorUf;

  async function sincronizarUf() {
    setSincronizando(true);
    try {
      const { data } = await api.get<{ valor: number; fecha: string }>("/admin/tarifas/uf/hoy");
      setUfSincronizada(data);
    } finally {
      setSincronizando(false);
    }
  }

  function formatFecha(iso: string) {
    const [y, m, d] = iso.split("-");
    return `${d}-${m}-${y}`;
  }

  const updateMutation = useMutation({
    mutationFn: (body: typeof form) =>
      api.put(`/admin/tarifas/${mes}`, {
        valorUf: ufVal,
        iva: Number(body.iva || efectiva.iva),
        precioKwh: Number(body.precioKwh || efectiva.precioKwh),
        precioM3Agua: Number(body.precioM3Agua || efectiva.precioM3Agua),
        toleranciaPago: Number(body.toleranciaPago || efectiva.toleranciaPago),
      }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tarifas", mes] }),
  });

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink">Tarifas y variables</h1>
          <p className="text-sm text-ink-2">Configuración del ciclo de facturación</p>
        </div>
        <input
          type="month"
          value={mes}
          onChange={(e) => setMes(e.target.value)}
          className="border border-border rounded-component px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
      </div>

      {/* Variables del mes */}
      <div className="bg-white border border-border rounded-card p-5">
        <h2 className="font-semibold text-ink mb-4">Variables del mes</h2>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Valor UF — solo lectura, se sincroniza con SII */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-ink-2 uppercase tracking-wide block">Valor UF ($)</label>
            <div className="w-full border border-border rounded-component px-3 py-2 text-sm font-mono bg-surface text-ink">
              {ufVal.toLocaleString("es-CL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="flex items-center gap-1.5">
              {ufSincronizada ? (
                <p className="text-xs text-ok">Datos actualizados al {formatFecha(ufSincronizada.fecha)}</p>
              ) : (
                <button
                  type="button"
                  onClick={sincronizarUf}
                  disabled={sincronizando}
                  className="flex items-center gap-1 text-xs text-accent hover:underline disabled:opacity-50"
                >
                  <RefreshCw size={11} className={sincronizando ? "animate-spin" : ""} />
                  {sincronizando ? "Sincronizando…" : "Sincronizar con SII"}
                </button>
              )}
            </div>
          </div>

          {[
            { label: "IVA (fracción)", key: "iva", placeholder: String(efectiva.iva) },
            { label: "Precio kWh ($)", key: "precioKwh", placeholder: String(efectiva.precioKwh) },
            { label: "Precio m³ agua ($)", key: "precioM3Agua", placeholder: String(efectiva.precioM3Agua) },
            { label: "Tolerancia pago ($)", key: "toleranciaPago", placeholder: String(efectiva.toleranciaPago), hint: "Diferencia aceptada en conciliación" },
          ].map(({ label, key, placeholder, hint }) => (
            <div key={key} className="space-y-1">
              <label className="text-xs font-medium text-ink-2 uppercase tracking-wide block">{label}</label>
              <input
                type="number"
                placeholder={placeholder}
                value={form[key as keyof typeof form]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                className="w-full border border-border rounded-component px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
              {hint && <p className="text-xs text-ink-2">{hint}</p>}
            </div>
          ))}
        </div>

        {updateMutation.isSuccess && (
          <p className="text-xs text-ok font-medium mt-3">✓ Guardado correctamente</p>
        )}

        <button
          onClick={() => updateMutation.mutate(form)}
          disabled={updateMutation.isPending}
          className="mt-4 bg-accent hover:bg-accent/90 disabled:opacity-60 text-white font-medium px-5 py-2 rounded-component text-sm transition-colors flex items-center gap-2"
        >
          <Save size={15} />
          {updateMutation.isPending ? "Guardando…" : "Guardar variables"}
        </button>
      </div>

      {/* Tarifas por categoría */}
      <div className="bg-white border border-border rounded-card p-5">
        <h2 className="font-semibold text-ink mb-4">UF/m² por categoría</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-ink-2 uppercase tracking-wide">
                <th className="text-left pb-2">Categoría</th>
                <th className="text-right pb-2">UF/m² Arriendo</th>
                <th className="text-right pb-2">UF/m² GC</th>
                <th className="text-right pb-2">Arriendo 50m² (mes)</th>
              </tr>
            </thead>
            <tbody>
              {CATEGORIAS.map(({ key, label }) => {
                const cat = categorias.find((c) => c.categoria === key);
                const arr50 = cat ? cat.ufM2Arriendo * 50 * ufVal : null;
                return (
                  <tr key={key} className="border-b border-border/60">
                    <td className="py-3 text-ink">{label}</td>
                    <td className="py-3 text-right font-mono">{cat?.ufM2Arriendo?.toFixed(4) ?? "—"}</td>
                    <td className="py-3 text-right font-mono">{cat?.ufM2Gc?.toFixed(4) ?? "—"}</td>
                    <td className="py-3 text-right font-mono text-ink-2 text-xs">{arr50 ? clp(arr50) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Simulador */}
      <div className="bg-accent-soft/20 border border-accent/20 rounded-card p-5">
        <h2 className="font-semibold text-ink mb-1 flex items-center gap-2"><Calculator size={16} className="text-accent" /> Simulador de impacto</h2>
        <p className="text-xs text-ink-2 mb-4">Calcula el arriendo estimado para un local de referencia</p>
        <div className="flex items-center gap-3 text-sm flex-wrap">
          <span>50 m² en Boulevard A</span>
          <span className="font-mono font-semibold text-accent">
            ≈ {clp((categorias.find((c) => c.categoria === "BOULEVARD_A")?.ufM2Arriendo ?? 0.12) * 50 * ufVal)} /mes (+ GC + IVA)
          </span>
        </div>
      </div>
    </div>
  );
}
