import { useState, Fragment } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User, ChevronDown, ChevronRight, Home, LayoutGrid, Zap, Pencil, ArrowLeft } from "lucide-react";
import { clp, formatMes, categoriaLabel } from "@/lib/utils";
import { useMes } from "@/hooks/useMes";
import { Modal } from "@/components/shared/Modal";
import api from "@/lib/api";
import { Arrendatario, Local, Contrato, DashboardData } from "@/types";

type LocalConContrato = Local & {
  contratos?: Array<Contrato & { arrendatario?: Arrendatario }>;
};

interface LecturaLuz {
  localId: string;
  costoAfecto: number | null;
  costoExento: number | null;
}

interface LecturaAgua {
  localId: string;
  costoTotal: number | null;
}

interface ModalContratoState {
  contratoId: string;
  localCodigo: string;
  values: {
    ufM2Arriendo: string;
    ufM2Gc: string;
    ufM2Terraza: string;
    ufM2GcTerraza: string;
    precioFijoArriendo: string;
    precioFijoGc: string;
    fondoPromo: string;
    vigenciaHasta: string;
  };
}

const CONTRATO_FIELDS: { key: keyof ModalContratoState["values"]; label: string }[] = [
  { key: "ufM2Arriendo", label: "UF/m² Arriendo" },
  { key: "ufM2Gc", label: "UF/m² GC" },
  { key: "ufM2Terraza", label: "UF/m² Terraza" },
  { key: "ufM2GcTerraza", label: "UF/m² GC Terraza" },
  { key: "precioFijoArriendo", label: "Precio fijo Arriendo (UF)" },
  { key: "precioFijoGc", label: "Precio fijo GC (UF)" },
  { key: "fondoPromo", label: "Fondo Promo (UF)" },
];

export default function DetalleArrendatario() {
  const { id } = useParams<{ id: string }>();
  const { mes, setMes } = useMes();
  const qc = useQueryClient();

  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());
  const [modalContrato, setModalContrato] = useState<ModalContratoState | null>(null);
  const [modalLuz, setModalLuz] = useState<{ localId: string; localCodigo: string; costoAfecto: string; costoExento: string } | null>(null);
  const [modalAgua, setModalAgua] = useState<{ localId: string; localCodigo: string; costoTotal: string } | null>(null);

  const toggleExpand = (localId: string) =>
    setExpandidos((prev) => {
      const next = new Set(prev);
      next.has(localId) ? next.delete(localId) : next.add(localId);
      return next;
    });

  const { data: arrendatario, isLoading } = useQuery<Arrendatario>({
    queryKey: ["arrendatario", id],
    queryFn: () => api.get(`/admin/arrendatarios/${id}`).then((r) => r.data),
    enabled: !!id,
  });

  const { data: todosLocales = [] } = useQuery<LocalConContrato[]>({
    queryKey: ["locales"],
    queryFn: () => api.get("/admin/locales").then((r) => r.data),
  });

  const locales = todosLocales.filter((l) =>
    l.contratos?.some((c) => c.activo && c.arrendatarioId === id)
  );

  const { data: dashboard } = useQuery<DashboardData>({
    queryKey: ["dashboard", mes],
    queryFn: () => api.get(`/admin/dashboard/${mes}`).then((r) => r.data),
  });

  const { data: lecturas } = useQuery<{ luz: LecturaLuz[]; agua: LecturaAgua[] }>({
    queryKey: ["lecturas", mes],
    queryFn: () =>
      api.get("/admin/lecturas", { params: { mes } }).then((r) => r.data).catch(() => ({ luz: [], agua: [] })),
  });

  const mapaLuz: Record<string, { afecto: number; exento: number }> = {};
  for (const l of lecturas?.luz ?? []) {
    if (l.costoAfecto != null || l.costoExento != null) {
      mapaLuz[l.localId] = { afecto: l.costoAfecto ?? 0, exento: l.costoExento ?? 0 };
    }
  }

  const mapaAgua: Record<string, number> = {};
  for (const l of lecturas?.agua ?? []) {
    if (l.costoTotal != null) mapaAgua[l.localId] = l.costoTotal;
  }

  const ufVal = dashboard?.proyeccion.valorUf ?? 0;

  // Summary totals across all locales
  let totArriendo = 0, totGc = 0, totServiciosAlr = 0, totLuz = 0, totAgua = 0;
  for (const local of locales) {
    const c = local.contratos?.find((c) => c.activo && c.arrendatarioId === id);
    const m2T = local.m2Terraza ?? 0;
    if (c) {
      totArriendo += c.precioFijoArriendo != null
        ? c.precioFijoArriendo * ufVal
        : (local.m2 * c.ufM2Arriendo + m2T * (c.ufM2Terraza ?? 0)) * ufVal;
      totGc += c.precioFijoGc != null
        ? c.precioFijoGc * ufVal
        : (local.m2 * c.ufM2Gc + m2T * (c.ufM2GcTerraza ?? 0)) * ufVal;
      if (c.fondoPromo != null) totServiciosAlr += c.fondoPromo * ufVal;
    }
    const luz = mapaLuz[local.id];
    if (luz) totLuz += luz.afecto + luz.exento;
    if (mapaAgua[local.id]) totAgua += mapaAgua[local.id];
  }

  const mutContrato = useMutation({
    mutationFn: ({ contratoId, data }: { contratoId: string; data: object }) =>
      api.put(`/admin/contratos/${contratoId}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["locales"] });
      setModalContrato(null);
    },
  });

  const mutLuz = useMutation({
    mutationFn: (data: object) => api.put("/admin/lecturas/luz", data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lecturas", mes] });
      setModalLuz(null);
    },
  });

  const mutAgua = useMutation({
    mutationFn: (data: object) => api.put("/admin/lecturas/agua", data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lecturas", mes] });
      setModalAgua(null);
    },
  });

  const openEditContrato = (local: LocalConContrato) => {
    const c = local.contratos?.find((c) => c.activo && c.arrendatarioId === id);
    if (!c) return;
    setModalContrato({
      contratoId: c.id,
      localCodigo: local.codigo,
      values: {
        ufM2Arriendo: String(c.ufM2Arriendo ?? ""),
        ufM2Gc: String(c.ufM2Gc ?? ""),
        ufM2Terraza: c.ufM2Terraza != null ? String(c.ufM2Terraza) : "",
        ufM2GcTerraza: c.ufM2GcTerraza != null ? String(c.ufM2GcTerraza) : "",
        precioFijoArriendo: c.precioFijoArriendo != null ? String(c.precioFijoArriendo) : "",
        precioFijoGc: c.precioFijoGc != null ? String(c.precioFijoGc) : "",
        fondoPromo: c.fondoPromo != null ? String(c.fondoPromo) : "",
        vigenciaHasta: c.vigenciaHasta ? c.vigenciaHasta.slice(0, 10) : "",
      },
    });
  };

  if (isLoading) return <div className="p-6 text-sm text-ink-2">Cargando…</div>;
  if (!arrendatario) return <div className="p-6 text-sm text-warn">Arrendatario no encontrado</div>;

  return (
    <div className="p-6 space-y-5 max-w-7xl">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link to="/admin" className="text-ink-2 hover:text-ink transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div className="w-10 h-10 rounded-card bg-accent-soft flex items-center justify-center">
            <User size={20} className="text-accent" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-ink">{arrendatario.nombreComercial ?? arrendatario.razonSocial}</h1>
            {arrendatario.nombreComercial && <p className="text-sm text-ink-2">{arrendatario.razonSocial}</p>}
            <p className="text-xs text-ink-2 font-mono">{arrendatario.rut}{arrendatario.email ? ` · ${arrendatario.email}` : ""}</p>
          </div>
        </div>
        <input
          type="month"
          value={mes}
          onChange={(e) => setMes(e.target.value)}
          className="border border-border rounded-component px-3 py-1.5 text-sm text-ink bg-white focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
      </div>

      {/* Resumen de totales */}
      <div className="grid grid-cols-2 xl:grid-cols-6 gap-3">
        {[
          { label: "Arriendo", value: totArriendo, icon: <Home size={13} /> },
          { label: "Gastos Comunes", value: totGc, icon: <LayoutGrid size={13} /> },
          { label: "Servicios ALR", value: totServiciosAlr, icon: null },
          { label: "Luz", value: totLuz, icon: <Zap size={13} /> },
          { label: "Agua", value: totAgua, icon: null },
          { label: "Total base", value: totArriendo + totGc + totServiciosAlr + totLuz + totAgua, bold: true },
        ].map(({ label, value, icon, bold }) => (
          <div key={label} className={`bg-white border rounded-card p-4 text-center ${bold ? "border-accent/40" : "border-border"}`}>
            <p className="text-xs text-ink-2 mb-1 flex items-center justify-center gap-1">{icon}{label}</p>
            <p className={`text-lg font-bold ${bold ? "text-accent" : "text-ink"}`}>
              {value > 0 ? clp(Math.round(value)) : <span className="text-sm font-normal text-ink-2">—</span>}
            </p>
          </div>
        ))}
      </div>

      {/* Tabla de locales */}
      <div className="bg-white border border-border rounded-card">
        <div className="p-4 border-b border-border">
          <h3 className="text-sm font-semibold text-ink">Locales — {formatMes(mes)}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border bg-paper-2 text-xs text-ink-2 uppercase tracking-wide">
                <th className="text-left px-4 py-3">Local</th>
                <th className="text-right px-4 py-3">m²</th>
                <th className="text-right px-4 py-3">Arriendo</th>
                <th className="text-right px-4 py-3">GC</th>
                <th className="text-right px-4 py-3">Servicios ALR</th>
                <th className="text-right px-4 py-3">Luz</th>
                <th className="text-right px-4 py-3">Agua</th>
                <th className="text-right px-4 py-3 font-bold">Total</th>
                <th className="px-4 py-3 w-8" />
              </tr>
            </thead>
            <tbody>
              {locales.map((local) => {
                const abierto = expandidos.has(local.id);
                const c = local.contratos?.find((c) => c.activo && c.arrendatarioId === id);
                const m2T = local.m2Terraza ?? 0;

                const ufArriendo = c ? local.m2 * c.ufM2Arriendo + m2T * (c.ufM2Terraza ?? 0) : 0;
                const ufGc = c ? local.m2 * c.ufM2Gc + m2T * (c.ufM2GcTerraza ?? 0) : 0;
                const proyArriendo = c
                  ? c.precioFijoArriendo != null ? c.precioFijoArriendo * ufVal : ufArriendo * ufVal
                  : 0;
                const proyGc = c
                  ? c.precioFijoGc != null ? c.precioFijoGc * ufVal : ufGc * ufVal
                  : 0;
                const proyServiciosAlr = c?.fondoPromo != null ? c.fondoPromo * ufVal : null;

                const luz = mapaLuz[local.id];
                const agua = mapaAgua[local.id] ?? 0;
                const totalLocal = proyArriendo + proyGc + (proyServiciosAlr ?? 0) + (luz ? luz.afecto + luz.exento : 0) + agua;

                return (
                  <Fragment key={local.id}>
                    <tr className={`border-b border-border/50 hover:bg-paper-2/40 transition-colors ${abierto ? "bg-paper-2/30" : ""}`}>
                      <td className="px-4 py-3">
                        <Link to={`/admin/locales/${local.id}`} className="font-mono font-bold text-accent text-xs hover:underline">
                          {local.codigo}
                        </Link>
                        <span className="block text-xs text-ink-2 mt-0.5">{categoriaLabel[local.categoria]}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs">{local.m2}</td>
                      <td className="px-4 py-3 text-right font-mono text-xs">{c ? clp(Math.round(proyArriendo)) : "—"}</td>
                      <td className="px-4 py-3 text-right font-mono text-xs">{c ? clp(Math.round(proyGc)) : "—"}</td>
                      <td className="px-4 py-3 text-right font-mono text-xs">
                        {proyServiciosAlr != null ? clp(Math.round(proyServiciosAlr)) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs">
                        {luz ? clp(Math.round(luz.afecto + luz.exento)) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs">{agua > 0 ? clp(Math.round(agua)) : "—"}</td>
                      <td className="px-4 py-3 text-right font-mono text-xs font-semibold text-ink">
                        {clp(Math.round(totalLocal))}
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => toggleExpand(local.id)} className="text-accent hover:text-accent/70 transition-colors">
                          {abierto ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </button>
                      </td>
                    </tr>

                    {abierto && (
                      <tr>
                        <td colSpan={9} className="border-b border-border/60 px-4 pb-4 pt-2 bg-paper/60">
                          <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
                            {/* Arriendo */}
                            <div className="bg-white border border-border rounded-component p-3 text-xs space-y-1">
                              <div className="flex items-center justify-between mb-2">
                                <p className="font-semibold text-ink flex items-center gap-1"><Home size={11} /> Arriendo</p>
                                {c && (
                                  <button onClick={() => openEditContrato(local)} className="text-ink-2 hover:text-accent transition-colors" title="Editar contrato">
                                    <Pencil size={12} />
                                  </button>
                                )}
                              </div>
                              {c ? (
                                c.precioFijoArriendo != null ? (
                                  <>
                                    <p className="text-ink-2">Precio fijo</p>
                                    <p className="font-mono">{c.precioFijoArriendo.toFixed(4)} UF × {clp(ufVal)}</p>
                                    <p className="font-bold text-ink border-t border-border pt-1 mt-1 font-mono">{clp(Math.round(c.precioFijoArriendo * ufVal))}</p>
                                  </>
                                ) : (
                                  <>
                                    <p className="text-ink-2">{local.m2} m² × {c.ufM2Arriendo} UF/m²{m2T > 0 && c.ufM2Terraza ? ` + ${m2T}m² × ${c.ufM2Terraza}` : ""}</p>
                                    <p className="font-mono text-accent">= {ufArriendo.toFixed(4)} UF</p>
                                    <p className="text-ink-2">× {clp(ufVal)} / UF</p>
                                    <p className="font-bold text-ink border-t border-border pt-1 mt-1 font-mono">{clp(Math.round(proyArriendo))}</p>
                                  </>
                                )
                              ) : <p className="italic text-ink-2">Sin contrato</p>}
                            </div>

                            {/* GC */}
                            <div className="bg-white border border-border rounded-component p-3 text-xs space-y-1">
                              <div className="flex items-center justify-between mb-2">
                                <p className="font-semibold text-ink flex items-center gap-1"><LayoutGrid size={11} /> Gastos Comunes</p>
                                {c && (
                                  <button onClick={() => openEditContrato(local)} className="text-ink-2 hover:text-accent transition-colors" title="Editar contrato">
                                    <Pencil size={12} />
                                  </button>
                                )}
                              </div>
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
                                    <p className="font-bold text-ink border-t border-border pt-1 mt-1 font-mono">{clp(Math.round(proyGc))}</p>
                                  </>
                                )
                              ) : <p className="italic text-ink-2">Sin contrato</p>}
                            </div>

                            {/* Servicios ALR */}
                            <div className="bg-white border border-border rounded-component p-3 text-xs space-y-1">
                              <div className="flex items-center justify-between mb-2">
                                <p className="font-semibold text-ink">Servicios ALR</p>
                                <button onClick={() => openEditContrato(local)} className="text-ink-2 hover:text-accent transition-colors" title="Editar contrato">
                                  <Pencil size={12} />
                                </button>
                              </div>
                              {proyServiciosAlr != null ? (
                                <>
                                  <p className="text-ink-2">Fondo Promo</p>
                                  <p className="font-mono">{c!.fondoPromo!.toFixed(4)} UF × {clp(ufVal)}</p>
                                  <p className="font-bold text-ink border-t border-border pt-1 mt-1 font-mono">{clp(Math.round(proyServiciosAlr))}</p>
                                </>
                              ) : <p className="italic text-ink-2">Sin fondo promo</p>}
                            </div>

                            {/* Luz */}
                            <div className="bg-white border border-border rounded-component p-3 text-xs space-y-1">
                              <div className="flex items-center justify-between mb-2">
                                <p className="font-semibold text-ink flex items-center gap-1"><Zap size={11} /> Luz</p>
                                <button
                                  onClick={() => setModalLuz({ localId: local.id, localCodigo: local.codigo, costoAfecto: luz ? String(Math.round(luz.afecto)) : "0", costoExento: luz ? String(Math.round(luz.exento)) : "0" })}
                                  className="text-ink-2 hover:text-accent transition-colors"
                                  title="Editar costo luz"
                                >
                                  <Pencil size={12} />
                                </button>
                              </div>
                              {luz ? (
                                <>
                                  <p className="text-ink-2">Afecto IVA</p>
                                  <p className="font-mono">{clp(Math.round(luz.afecto))}</p>
                                  <p className="text-ink-2 mt-1">Exento IVA</p>
                                  <p className="font-mono">{clp(Math.round(luz.exento))}</p>
                                  <p className="font-bold text-ink border-t border-border pt-1 mt-1 font-mono">{clp(Math.round(luz.afecto + luz.exento))}</p>
                                </>
                              ) : <p className="italic text-ink-2">Sin datos SCADA</p>}
                            </div>

                            {/* Agua */}
                            <div className="bg-white border border-border rounded-component p-3 text-xs space-y-1">
                              <div className="flex items-center justify-between mb-2">
                                <p className="font-semibold text-ink">Agua</p>
                                <button
                                  onClick={() => setModalAgua({ localId: local.id, localCodigo: local.codigo, costoTotal: agua > 0 ? String(Math.round(agua)) : "0" })}
                                  className="text-ink-2 hover:text-accent transition-colors"
                                  title="Editar costo agua"
                                >
                                  <Pencil size={12} />
                                </button>
                              </div>
                              {agua > 0 ? (
                                <p className="font-bold text-ink font-mono">{clp(Math.round(agua))}</p>
                              ) : <p className="italic text-ink-2">Sin datos</p>}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {locales.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-sm text-ink-2">
                    Sin locales activos para este arrendatario
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Contrato */}
      {modalContrato && (
        <Modal title={`Editar contrato — ${modalContrato.localCodigo}`} onClose={() => setModalContrato(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const v = modalContrato.values;
              mutContrato.mutate({
                contratoId: modalContrato.contratoId,
                data: {
                  ufM2Arriendo: v.ufM2Arriendo,
                  ufM2Gc: v.ufM2Gc,
                  ufM2Terraza: v.ufM2Terraza,
                  ufM2GcTerraza: v.ufM2GcTerraza,
                  precioFijoArriendo: v.precioFijoArriendo,
                  precioFijoGc: v.precioFijoGc,
                  fondoPromo: v.fondoPromo,
                  vigenciaHasta: v.vigenciaHasta,
                },
              });
            }}
            className="space-y-3"
          >
            <div className="grid grid-cols-2 gap-3">
              {CONTRATO_FIELDS.map(({ key, label }) => (
                <label key={key} className="block">
                  <span className="text-xs text-ink-2">{label}</span>
                  <input
                    type="number"
                    step="0.0001"
                    value={modalContrato.values[key]}
                    onChange={(e) =>
                      setModalContrato({ ...modalContrato, values: { ...modalContrato.values, [key]: e.target.value } })
                    }
                    className="mt-1 w-full border border-border rounded-component px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                </label>
              ))}
              <label className="block">
                <span className="text-xs text-ink-2">Vigencia hasta</span>
                <input
                  type="date"
                  value={modalContrato.values.vigenciaHasta}
                  onChange={(e) =>
                    setModalContrato({ ...modalContrato, values: { ...modalContrato.values, vigenciaHasta: e.target.value } })
                  }
                  className="mt-1 w-full border border-border rounded-component px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </label>
            </div>
            <div className="flex gap-2 justify-end pt-2 border-t border-border">
              <button type="button" onClick={() => setModalContrato(null)} className="px-4 py-2 text-sm text-ink-2 border border-border rounded-component hover:text-ink">
                Cancelar
              </button>
              <button type="submit" disabled={mutContrato.isPending} className="px-4 py-2 text-sm text-white bg-accent hover:bg-accent/90 rounded-component disabled:opacity-50">
                {mutContrato.isPending ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Luz */}
      {modalLuz && (
        <Modal title={`Costo luz — ${modalLuz.localCodigo} — ${formatMes(mes)}`} onClose={() => setModalLuz(null)} size="sm">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              mutLuz.mutate({ localId: modalLuz.localId, mes, costoAfecto: Number(modalLuz.costoAfecto), costoExento: Number(modalLuz.costoExento) });
            }}
            className="space-y-3"
          >
            {(["costoAfecto", "costoExento"] as const).map((key) => (
              <label key={key} className="block">
                <span className="text-xs text-ink-2">{key === "costoAfecto" ? "Afecto IVA ($)" : "Exento IVA ($)"}</span>
                <input
                  type="number"
                  value={modalLuz[key]}
                  onChange={(e) => setModalLuz({ ...modalLuz, [key]: e.target.value })}
                  className="mt-1 w-full border border-border rounded-component px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </label>
            ))}
            <div className="flex gap-2 justify-end pt-2 border-t border-border">
              <button type="button" onClick={() => setModalLuz(null)} className="px-4 py-2 text-sm text-ink-2 border border-border rounded-component">Cancelar</button>
              <button type="submit" disabled={mutLuz.isPending} className="px-4 py-2 text-sm text-white bg-accent rounded-component disabled:opacity-50">
                {mutLuz.isPending ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Agua */}
      {modalAgua && (
        <Modal title={`Costo agua — ${modalAgua.localCodigo} — ${formatMes(mes)}`} onClose={() => setModalAgua(null)} size="sm">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              mutAgua.mutate({ localId: modalAgua.localId, mes, costoTotal: Number(modalAgua.costoTotal) });
            }}
            className="space-y-3"
          >
            <label className="block">
              <span className="text-xs text-ink-2">Costo total agua ($)</span>
              <input
                type="number"
                value={modalAgua.costoTotal}
                onChange={(e) => setModalAgua({ ...modalAgua, costoTotal: e.target.value })}
                className="mt-1 w-full border border-border rounded-component px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </label>
            <div className="flex gap-2 justify-end pt-2 border-t border-border">
              <button type="button" onClick={() => setModalAgua(null)} className="px-4 py-2 text-sm text-ink-2 border border-border rounded-component">Cancelar</button>
              <button type="submit" disabled={mutAgua.isPending} className="px-4 py-2 text-sm text-white bg-accent rounded-component disabled:opacity-50">
                {mutAgua.isPending ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
