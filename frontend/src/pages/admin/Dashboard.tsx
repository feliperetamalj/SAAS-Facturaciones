import { useState, useMemo, Fragment } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  LineChart, Line, Cell, PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import { TrendingUp, Building2, AlertTriangle, CheckCircle, ChevronRight, ChevronDown, Home, LayoutGrid, Zap } from "lucide-react";
import { KPICard } from "@/components/shared/KPICard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { clp, formatMes, categoriaLabel, estadoConfig } from "@/lib/utils";
import { useMes } from "@/hooks/useMes";
import api from "@/lib/api";
import { DashboardData, Local, Factura, EstadoFactura, Contrato } from "@/types";

const DONUT_COLORS = ["#4A8A95", "#6B9A6B", "#D88864", "#dc2626", "#6B635A"];

type FiltroEstado = "todos" | "mora" | "pagado" | "pendiente";

export default function Dashboard() {
  const { mes, setMes } = useMes();
  const [filtro, setFiltro] = useState<FiltroEstado>("todos");
  const [busqueda, setBusqueda] = useState("");

  const { data: dashboard, isLoading: loadingDash } = useQuery<DashboardData>({
    queryKey: ["dashboard", mes],
    queryFn: () => api.get(`/admin/dashboard/${mes}`).then((r) => r.data),
  });

  const { data: locales = [] } = useQuery<(Local & { contratos?: Array<Contrato & { arrendatario?: { id: string; razonSocial: string; nombreComercial?: string; rut: string } }> })[]>({
    queryKey: ["locales"],
    queryFn: () => api.get("/admin/locales").then((r) => r.data),
  });

  const { data: facturasMes = [] } = useQuery<Factura[]>({
    queryKey: ["facturas-mes", mes],
    queryFn: () =>
      api.get("/admin/facturas", { params: { mes } }).then((r) => r.data).catch(() => []),
  });

  const { data: lecturas } = useQuery<{ luz: { localId: string; costoAfecto: number | null; costoExento: number | null }[] }>({
    queryKey: ["lecturas", mes],
    queryFn: () => api.get("/admin/lecturas", { params: { mes } }).then((r) => r.data).catch(() => ({ luz: [] })),
  });

  const mapaLuz: Record<string, { afecto: number; exento: number }> = {};
  for (const l of lecturas?.luz ?? []) {
    if (l.costoAfecto != null || l.costoExento != null) {
      mapaLuz[l.localId] = { afecto: l.costoAfecto ?? 0, exento: l.costoExento ?? 0 };
    }
  }
  const totalLuz = Object.values(mapaLuz).reduce((s, v) => s + v.afecto + v.exento, 0);

  const totalServiciosAlr = locales.reduce((sum, l) => {
    const c = l.contratos?.[0];
    return c?.fondoPromo != null ? sum + c.fondoPromo * (dashboard?.proyeccion.valorUf ?? 0) : sum;
  }, 0);

  const mapaFacturas: Record<string, Factura> = {};
  for (const f of facturasMes) mapaFacturas[f.localId] = f;

  const localesFiltrados = locales.filter((l) => {
    const factura = mapaFacturas[l.id];
    const matchBusqueda =
      !busqueda ||
      l.codigo.toLowerCase().includes(busqueda.toLowerCase()) ||
      (l.contratos?.[0]?.arrendatario?.razonSocial ?? "").toLowerCase().includes(busqueda.toLowerCase());

    if (!matchBusqueda) return false;
    if (filtro === "mora") return factura?.estado === "mora" || factura?.estado === "vencida";
    if (filtro === "pagado") return factura?.estado === "pagada";
    if (filtro === "pendiente") return factura && !["pagada", "anulada", "borrador"].includes(factura.estado);
    return true;
  });

  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());
  const toggleExpand = (id: string) => setExpandidos((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  type LocalRow = (typeof locales)[number];
  type Grupo = { key: string; nombre: string | null; locales: LocalRow[] };

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const localesAgrupados = useMemo<Grupo[]>(() => {
    const map = new Map<string, Grupo>();
    for (const local of localesFiltrados) {
      const arr = local.contratos?.[0]?.arrendatario;
      const key = arr?.id ?? `__sin__${local.id}`;
      if (!map.has(key)) map.set(key, { key, nombre: arr?.razonSocial ?? null, locales: [] });
      map.get(key)!.locales.push(local);
    }
    return Array.from(map.values()).sort((a, b) => {
      if (!a.nombre && b.nombre) return 1;
      if (a.nombre && !b.nombre) return -1;
      return (a.nombre ?? "").localeCompare(b.nombre ?? "", "es");
    });
  }, [localesFiltrados]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink">Dashboard</h1>
          <p className="text-sm text-ink-2">Centro Comercial Alto Las Rastras</p>
        </div>
        <input
          type="month"
          value={mes}
          onChange={(e) => setMes(e.target.value)}
          className="border border-border rounded-component px-3 py-1.5 text-sm text-ink bg-white focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
      </div>

      {/* KPIs — facturación real */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard
          title="Facturado"
          value={loadingDash ? "…" : clp(dashboard?.kpis.facturado ?? 0)}
          subtitle={formatMes(mes)}
          icon={<TrendingUp size={16} />}
          variant="accent"
        />
        <KPICard
          title="Cobrado"
          value={loadingDash ? "…" : clp(dashboard?.kpis.cobrado ?? 0)}
          subtitle={
            dashboard
              ? `${Math.round((dashboard.kpis.cobrado / (dashboard.kpis.facturado || 1)) * 100)}% del total`
              : ""
          }
          icon={<CheckCircle size={16} />}
          variant="ok"
        />
        <KPICard
          title="En mora"
          value={loadingDash ? "…" : clp(dashboard?.kpis.mora ?? 0)}
          icon={<AlertTriangle size={16} />}
          variant="warn"
        />
        <KPICard
          title="Locales activos"
          value={loadingDash ? "…" : String(dashboard?.kpis.localesActivos ?? 0)}
          subtitle={`de ${locales.length} totales`}
          icon={<Building2 size={16} />}
        />
      </div>

      {/* Proyección del mes (contratos activos × UF hoy) */}
      {dashboard?.proyeccion && (
        <div className="bg-white border border-border rounded-card p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-ink-2 uppercase tracking-wide">
              Proyección del mes — contratos activos
            </p>
            <span className="text-xs text-ink-2 font-mono">
              UF {dashboard.proyeccion.valorUf.toLocaleString("es-CL", { minimumFractionDigits: 2 })}
              <span className="ml-1 text-ink-2/60">({dashboard.proyeccion.fuente})</span>
            </span>
          </div>
          <div className="grid grid-cols-5 gap-4">
            <div className="text-center border-r border-border">
              <p className="text-xs text-ink-2 mb-1 flex items-center justify-center gap-1"><Home size={11} /> Arriendo</p>
              <p className="text-lg font-bold text-ink">{clp(dashboard.proyeccion.arriendo)}</p>
            </div>
            <div className="text-center border-r border-border">
              <p className="text-xs text-ink-2 mb-1 flex items-center justify-center gap-1"><LayoutGrid size={11} /> Gastos Comunes</p>
              <p className="text-lg font-bold text-ink">{clp(dashboard.proyeccion.gc)}</p>
            </div>
            <div className="text-center border-r border-border">
              <p className="text-xs text-ink-2 mb-1">Servicios ALR</p>
              <p className="text-lg font-bold text-ink">{totalServiciosAlr > 0 ? clp(Math.round(totalServiciosAlr)) : <span className="text-ink-2 text-sm font-normal">—</span>}</p>
            </div>
            <div className="text-center border-r border-border">
              <p className="text-xs text-ink-2 mb-1 flex items-center justify-center gap-1"><Zap size={11} /> Luz (SCADA)</p>
              <p className="text-lg font-bold text-ink">{totalLuz > 0 ? clp(Math.round(totalLuz)) : <span className="text-ink-2 text-sm font-normal">—</span>}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-ink-2 mb-1 font-medium">Total base s/IVA</p>
              <p className="text-lg font-bold text-accent">{clp(dashboard.proyeccion.total + Math.round(totalServiciosAlr) + Math.round(totalLuz))}</p>
            </div>
          </div>
        </div>
      )}

      {/* Gráficos */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Line chart ingresos */}
        <div className="xl:col-span-2 bg-white border border-border rounded-card p-5">
          <h3 className="text-sm font-semibold text-ink mb-4">Ingresos últimos 12 meses</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={dashboard?.serieIngresos ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EBE6DF" />
              <XAxis dataKey="mes" tick={{ fontSize: 10, fill: "#6B635A" }} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fontSize: 10, fill: "#6B635A" }} tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`} />
              <Tooltip formatter={(v: number) => clp(v)} labelFormatter={(l) => formatMes(String(l))} />
              <Line type="monotone" dataKey="facturado" stroke="#4A8A95" strokeWidth={2} dot={false} name="Facturado" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Donut estado lote */}
        <div className="bg-white border border-border rounded-card p-5">
          <h3 className="text-sm font-semibold text-ink mb-4">Estado del lote — {formatMes(mes)}</h3>
          {dashboard?.estadoLote.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={dashboard.estadoLote}
                  cx="50%" cy="50%"
                  innerRadius={55} outerRadius={85}
                  dataKey="count"
                  nameKey="estado"
                  label={({ estado, count }) => `${estadoConfig[estado as EstadoFactura]?.label ?? estado}: ${count}`}
                  labelLine={false}
                >
                  {dashboard.estadoLote.map((_, i) => (
                    <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number, name: string) => [v, estadoConfig[name as EstadoFactura]?.label ?? name]} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-ink-2 text-center mt-8">Sin datos para este mes</p>
          )}
        </div>
      </div>

      {/* Tabla de locales */}
      <div className="bg-white border border-border rounded-card">
        <div className="p-4 border-b border-border flex items-center gap-3 flex-wrap">
          <h3 className="text-sm font-semibold text-ink">Locales — {formatMes(mes)}</h3>
          <div className="flex-1" />
          <input
            placeholder="Buscar local o arrendatario…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="border border-border rounded-component px-3 py-1.5 text-xs w-52 focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
          <div className="flex gap-1">
            {(["todos", "mora", "pagado", "pendiente"] as FiltroEstado[]).map((f) => (
              <button
                key={f}
                onClick={() => setFiltro(f)}
                className={`px-2.5 py-1 rounded-component text-xs capitalize transition-colors ${
                  filtro === f
                    ? "bg-accent text-white"
                    : "bg-paper-2 text-ink-2 hover:bg-paper"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border bg-paper-2 text-xs text-ink-2 uppercase tracking-wide">
                <th className="text-left px-5 py-3 w-52">Arrendatario</th>
                <th className="text-left px-4 py-3 w-28">Local</th>
                <th className="text-right px-4 py-3">m²</th>
                <th className="text-right px-4 py-3">Arriendo</th>
                <th className="text-right px-4 py-3">GC</th>
                <th className="text-right px-4 py-3">Servicios ALR</th>
                <th className="text-right px-4 py-3">Luz</th>
                <th className="text-right px-4 py-3">Agua</th>
                <th className="text-right px-4 py-3 font-bold">Total</th>
                <th className="text-center px-4 py-3">Estado</th>
                <th className="px-4 py-3 w-8" />
              </tr>
            </thead>
            <tbody>
              {localesAgrupados.map((grupo, gi) => {
                const ufVal = dashboard?.proyeccion.valorUf ?? 0;
                const arr = grupo.locales[0]?.contratos?.[0]?.arrendatario;
                // rowSpan crece 1 por cada local expandido dentro del grupo
                const rowspan = grupo.locales.length + grupo.locales.filter((l) => expandidos.has(l.id)).length;

                return grupo.locales.map((local, li) => {
                  const abierto = expandidos.has(local.id);
                  const f = mapaFacturas[local.id];
                  const items = f?.itemsJson;
                  const c = local.contratos?.[0];
                  const m2T = local.m2Terraza ?? 0;

                  const ufArriendo = c ? (local.m2 * c.ufM2Arriendo + m2T * (c.ufM2Terraza ?? 0)) : 0;
                  const ufGc      = c ? (local.m2 * c.ufM2Gc      + m2T * (c.ufM2GcTerraza ?? 0)) : 0;

                  const proyArriendo = c
                    ? c.precioFijoArriendo != null ? c.precioFijoArriendo * ufVal : ufArriendo * ufVal
                    : null;
                  const proyGc = c
                    ? c.precioFijoGc != null ? c.precioFijoGc * ufVal : ufGc * ufVal
                    : null;
                  const proyServiciosAlr = c?.fondoPromo != null ? c.fondoPromo * ufVal : null;

                  const luz = mapaLuz[local.id];

                  return (
                    <Fragment key={local.id}>
                      {/* ── Fila principal ── */}
                      <tr className={`border-b border-border/50 hover:bg-paper-2/40 transition-colors ${li === 0 && gi > 0 ? "border-t-2 border-t-border" : ""} ${abierto ? "bg-paper-2/30" : ""}`}>
                        {li === 0 && (
                          <td rowSpan={rowspan} className="px-5 py-3 align-top border-r border-border/40">
                            {arr ? (
                              <div>
                                <Link to={`/admin/arrendatarios/${arr.id}`} className="font-semibold text-accent text-sm leading-snug hover:underline">
                                  {arr.nombreComercial ?? arr.razonSocial}
                                </Link>
                                {arr.nombreComercial && <p className="text-xs text-ink-2 mt-0.5">{arr.razonSocial}</p>}
                                <p className="font-mono text-xs text-ink-2 mt-1">{arr.rut}</p>
                              </div>
                            ) : (
                              <span className="text-xs italic text-ink-2">Sin arrendatario</span>
                            )}
                          </td>
                        )}
                        <td className="px-4 py-3">
                          <Link to={`/admin/locales/${local.id}`} className="font-mono font-bold text-accent text-xs hover:underline">{local.codigo}</Link>
                          <span className="block text-xs text-ink-2 mt-0.5">{categoriaLabel[local.categoria]}</span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs">{local.m2}</td>
                        <td className="px-4 py-3 text-right font-mono text-xs">
                          {items ? clp(items.arriendo) : proyArriendo != null ? <span className="text-ink-2">{clp(Math.round(proyArriendo))}</span> : "—"}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs">
                          {items ? clp(items.gastosComunales) : proyGc != null ? <span className="text-ink-2">{clp(Math.round(proyGc))}</span> : "—"}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs">
                          {proyServiciosAlr != null ? <span className="text-ink-2">{clp(Math.round(proyServiciosAlr))}</span> : "—"}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs">
                          {items ? clp(items.luz) : luz ? <span className="text-ink-2">{clp(Math.round(luz.afecto + luz.exento))}</span> : "—"}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs">{items ? clp(items.agua) : "—"}</td>
                        <td className="px-4 py-3 text-right font-mono text-xs font-semibold text-ink">{f ? clp(f.total) : "—"}</td>
                        <td className="px-4 py-3 text-center">{f ? <StatusBadge estado={f.estado} /> : <span className="text-xs text-ink-2">—</span>}</td>
                        <td className="px-4 py-3">
                          <button onClick={() => toggleExpand(local.id)} className="text-accent hover:text-accent/70 transition-colors">
                            {abierto ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </button>
                        </td>
                      </tr>

                      {/* ── Fila de desglose (colSpan=10: columna arrendatario cubierta por rowSpan) ── */}
                      {abierto && (
                        <tr className={li === 0 && gi > 0 ? "" : ""}>
                          <td colSpan={10} className="border-b border-border/60 px-5 pb-4 pt-1 bg-paper/60">
                            <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">

                              {/* Arriendo */}
                              <div className="bg-white border border-border rounded-component p-3 space-y-1 text-xs">
                                <p className="font-semibold text-ink flex items-center gap-1 mb-2"><Home size={11} /> Arriendo</p>
                                {c ? (
                                  c.precioFijoArriendo != null ? (
                                    <>
                                      <p className="text-ink-2">Precio fijo</p>
                                      <p className="font-mono">{c.precioFijoArriendo.toFixed(4)} UF × {clp(ufVal)}</p>
                                      <p className="font-bold text-ink border-t border-border pt-1 mt-1 font-mono">{clp(Math.round(c.precioFijoArriendo * ufVal))}</p>
                                    </>
                                  ) : (
                                    <>
                                      <p className="text-ink-2">{local.m2} m² × {c.ufM2Arriendo} UF/m²{m2T > 0 && c.ufM2Terraza ? ` + ${m2T} m² terraza × ${c.ufM2Terraza} UF/m²` : ""}</p>
                                      <p className="font-mono text-accent">= {ufArriendo.toFixed(4)} UF</p>
                                      <p className="text-ink-2">× {clp(ufVal)} / UF</p>
                                      <p className="font-bold text-ink border-t border-border pt-1 mt-1 font-mono">{clp(Math.round(proyArriendo ?? 0))}</p>
                                    </>
                                  )
                                ) : <p className="italic text-ink-2">Sin contrato</p>}
                                {items && <p className="text-ok text-xs mt-1">Facturado: {clp(items.arriendo)}</p>}
                              </div>

                              {/* GC */}
                              <div className="bg-white border border-border rounded-component p-3 space-y-1 text-xs">
                                <p className="font-semibold text-ink flex items-center gap-1 mb-2"><LayoutGrid size={11} /> Gastos Comunes</p>
                                {c ? (
                                  c.precioFijoGc != null ? (
                                    <>
                                      <p className="text-ink-2">Precio fijo</p>
                                      <p className="font-mono">{c.precioFijoGc.toFixed(4)} UF × {clp(ufVal)}</p>
                                      <p className="font-bold text-ink border-t border-border pt-1 mt-1 font-mono">{clp(Math.round(c.precioFijoGc * ufVal))}</p>
                                    </>
                                  ) : (
                                    <>
                                      <p className="text-ink-2">{local.m2} m² × {c.ufM2Gc} UF/m²</p>
                                      {m2T > 0 && c.ufM2GcTerraza ? (
                                        <p className="text-ink-2">+ {m2T} m² terraza × {c.ufM2GcTerraza} UF/m²</p>
                                      ) : null}
                                      <p className="font-mono text-accent">= {ufGc.toFixed(4)} UF</p>
                                      <p className="text-ink-2">× {clp(ufVal)} / UF</p>
                                      <p className="font-bold text-ink border-t border-border pt-1 mt-1 font-mono">{clp(Math.round(proyGc ?? 0))}</p>
                                    </>
                                  )
                                ) : <p className="italic text-ink-2">Sin contrato</p>}
                                {items && <p className="text-ok text-xs mt-1">Facturado: {clp(items.gastosComunales)}</p>}
                              </div>

                              {/* Servicios ALR */}
                              <div className="bg-white border border-border rounded-component p-3 space-y-1 text-xs">
                                <p className="font-semibold text-ink mb-2">Servicios ALR</p>
                                {proyServiciosAlr != null ? (
                                  <>
                                    <p className="text-ink-2">Fondo Promo</p>
                                    <p className="font-mono">{c!.fondoPromo!.toFixed(4)} UF × {clp(ufVal)}</p>
                                    <p className="font-bold text-ink border-t border-border pt-1 mt-1 font-mono">{clp(Math.round(proyServiciosAlr))}</p>
                                  </>
                                ) : <p className="italic text-ink-2">Sin fondo promo</p>}
                              </div>

                              {/* Luz */}
                              <div className="bg-white border border-border rounded-component p-3 space-y-1 text-xs">
                                <p className="font-semibold text-ink flex items-center gap-1 mb-2"><Zap size={11} /> Luz</p>
                                {luz ? (
                                  <>
                                    <p className="text-ink-2">Afecto IVA</p>
                                    <p className="font-mono">{clp(Math.round(luz.afecto))}</p>
                                    <p className="text-ink-2 mt-1">Exento IVA</p>
                                    <p className="font-mono">{clp(Math.round(luz.exento))}</p>
                                    <p className="font-bold text-ink border-t border-border pt-1 mt-1 font-mono">{clp(Math.round(luz.afecto + luz.exento))}</p>
                                  </>
                                ) : items?.luz ? (
                                  <>
                                    <p className="text-ink-2">Facturado</p>
                                    <p className="font-bold text-ink font-mono">{clp(items.luz)}</p>
                                  </>
                                ) : <p className="italic text-ink-2">Sin datos SCADA</p>}
                              </div>

                              {/* Agua */}
                              <div className="bg-white border border-border rounded-component p-3 space-y-1 text-xs">
                                <p className="font-semibold text-ink mb-2">Agua</p>
                                {items?.agua ? (
                                  <>
                                    <p className="text-ink-2">Facturado</p>
                                    <p className="font-bold text-ink font-mono">{clp(items.agua)}</p>
                                  </>
                                ) : <p className="italic text-ink-2">Sin datos</p>}
                                {items?.multas ? (
                                  <p className="text-warn text-xs mt-2">Multas: {clp(items.multas)}</p>
                                ) : null}
                              </div>

                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                });
              })}
              {localesAgrupados.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-sm text-ink-2">
                    No se encontraron locales
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
