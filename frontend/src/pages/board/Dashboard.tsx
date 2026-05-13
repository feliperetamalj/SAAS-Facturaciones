import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { clp, formatMes, pct } from "@/lib/utils";
import { KPICard } from "@/components/shared/KPICard";
import { Factura } from "@/types";
import api from "@/lib/api";

export default function BoardDashboard() {
  const mes = new Date().toISOString().slice(0, 7);

  const { data: kpis } = useQuery({
    queryKey: ["board-kpis", mes],
    queryFn: () => api.get(`/board/kpis/${mes}`).then((r) => r.data),
  });

  const { data: serie } = useQuery({
    queryKey: ["board-serie"],
    queryFn: () => api.get("/board/serie/24").then((r) => r.data),
  });

  const { data: ocupacion = [] } = useQuery<Array<{
    id: string; codigo: string; m2: number; categoria: string;
    estado: string; arrendatario: string | null;
    facturaMes: Factura | null;
  }>>({
    queryKey: ["board-ocupacion"],
    queryFn: () => api.get("/board/ocupacion").then((r) => r.data),
  });

  const { data: ranking = [] } = useQuery<Array<{ localCodigo: string; arrendatario: string; total: number }>>({
    queryKey: ["board-ranking", mes],
    queryFn: () => api.get(`/board/ranking/${mes}`).then((r) => r.data),
  });

  const estadoColor = (estado: string) => {
    if (estado === "pagada") return "bg-ok";
    if (estado === "mora" || estado === "vencida") return "bg-warn";
    if (estado === "vacio") return "bg-paper-2";
    return "bg-accent-soft";
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ink">Vista ejecutiva</h1>
        <p className="text-sm text-ink-2">Junta Directiva · {formatMes(mes)}</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard title="Ingresos" value={kpis ? clp(kpis.facturado) : "…"} variant="accent" />
        <KPICard title="% Cobrado" value={kpis ? pct(kpis.porcentajeCobrado) : "…"} variant="ok" />
        <KPICard title="Morosidad" value={kpis ? clp(kpis.mora) : "…"} variant="warn" />
        <KPICard
          title="Ocupación"
          value={kpis ? pct(kpis.ocupacion) : "…"}
          subtitle={kpis ? `${kpis.localesActivos} / ${kpis.totalLocales} locales` : ""}
        />
      </div>

      {/* Serie 24 meses */}
      <div className="bg-white border border-border rounded-card p-5">
        <h3 className="text-sm font-semibold text-ink mb-4">Facturado vs Cobrado — 24 meses</h3>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={serie ?? []}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EBE6DF" />
            <XAxis dataKey="mes" tick={{ fontSize: 9, fill: "#6B635A" }} tickFormatter={(v) => v.slice(5)} />
            <YAxis tick={{ fontSize: 9, fill: "#6B635A" }} tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`} />
            <Tooltip formatter={(v: number) => clp(v)} labelFormatter={(l) => formatMes(String(l))} />
            <Legend />
            <Line type="monotone" dataKey="facturado" stroke="#4A8A95" strokeWidth={2} dot={false} name="Facturado" />
            <Line type="monotone" dataKey="cobrado" stroke="#6B9A6B" strokeWidth={2} dot={false} name="Cobrado" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Mapa de ocupación */}
        <div className="bg-white border border-border rounded-card p-5">
          <h3 className="text-sm font-semibold text-ink mb-3">Mapa de locales</h3>
          <div className="flex gap-3 text-xs text-ink-2 mb-3 flex-wrap">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-ok inline-block" /> Pagado</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-accent-soft inline-block" /> Pendiente</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-warn inline-block" /> Mora</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-paper-2 border border-border inline-block" /> Vacío</span>
          </div>
          <div className="grid grid-cols-8 gap-1.5">
            {ocupacion.map((l) => (
              <div
                key={l.id}
                title={`${l.codigo} — ${l.arrendatario ?? "Vacío"} — ${l.facturaMes?.estado ?? l.estado}`}
                className={`w-full aspect-square rounded-sm ${estadoColor(l.facturaMes?.estado ?? l.estado)} flex items-center justify-center cursor-default`}
              >
                <span className="text-[7px] font-mono text-ink/60 leading-none">{l.codigo.slice(-3)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Ranking */}
        <div className="bg-white border border-border rounded-card p-5">
          <h3 className="text-sm font-semibold text-ink mb-3">Top ingresos — {formatMes(mes)}</h3>
          <div className="space-y-2">
            {ranking.map((r, i) => (
              <div key={r.localCodigo} className="flex items-center gap-3">
                <span className="text-xs font-mono text-ink-2 w-4">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-ink truncate">{r.arrendatario}</p>
                  <p className="text-xs text-ink-2 font-mono">{r.localCodigo}</p>
                </div>
                <span className="font-mono text-sm font-semibold text-accent">{clp(r.total)}</span>
              </div>
            ))}
            {ranking.length === 0 && <p className="text-xs text-ink-2 text-center py-4">Sin datos</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
