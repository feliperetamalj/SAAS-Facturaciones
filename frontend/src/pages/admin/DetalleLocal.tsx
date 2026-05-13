import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Building2, User, FileText, Clock, Pencil, Zap } from "lucide-react";
import { clp, formatMes, formatFecha, categoriaLabel } from "@/lib/utils";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Modal } from "@/components/shared/Modal";
import { Local, Factura } from "@/types";
import { useMes } from "@/hooks/useMes";
import api from "@/lib/api";

interface ContratoDetalle {
  id: string;
  localId: string;
  arrendatarioId: string;
  activo: boolean;
  ufM2Arriendo: number;
  ufM2Gc: number;
  ufM2Terraza?: number | null;
  ufM2GcTerraza?: number | null;
  fondoPromo?: number | null;
  precioFijoArriendo?: number | null;
  precioFijoGc?: number | null;
  vigenciaDesde: string;
  vigenciaHasta?: string;
  arrendatario: { razonSocial: string; rut: string; email: string; telefono?: string };
}

interface LocalDetalle extends Omit<Local, "contratos"> {
  contratos: ContratoDetalle[];
  facturas: Factura[];
}

interface LecturasMes {
  luz: { localId: string; costoAfecto: number | null; costoExento: number | null }[];
  agua: { localId: string; costoTotal: number | null }[];
}

const CONTRATO_FIELDS: { key: keyof ContratoEditValues; label: string }[] = [
  { key: "ufM2Arriendo", label: "UF/m² Arriendo" },
  { key: "ufM2Gc", label: "UF/m² GC" },
  { key: "ufM2Terraza", label: "UF/m² Terraza" },
  { key: "ufM2GcTerraza", label: "UF/m² GC Terraza" },
  { key: "precioFijoArriendo", label: "Precio fijo Arriendo (UF)" },
  { key: "precioFijoGc", label: "Precio fijo GC (UF)" },
  { key: "fondoPromo", label: "Fondo Promo (UF)" },
];

interface ContratoEditValues {
  ufM2Arriendo: string;
  ufM2Gc: string;
  ufM2Terraza: string;
  ufM2GcTerraza: string;
  precioFijoArriendo: string;
  precioFijoGc: string;
  fondoPromo: string;
  vigenciaHasta: string;
}

export default function DetalleLocal() {
  const { id } = useParams<{ id: string }>();
  const { mes, setMes } = useMes();
  const qc = useQueryClient();

  const [modalContrato, setModalContrato] = useState<ContratoEditValues | null>(null);
  const [modalLuz, setModalLuz] = useState<{ costoAfecto: string; costoExento: string } | null>(null);
  const [modalAgua, setModalAgua] = useState<{ costoTotal: string } | null>(null);

  const { data: local, isLoading } = useQuery<LocalDetalle>({
    queryKey: ["local", id],
    queryFn: () => api.get(`/admin/locales/${id}`).then((r) => r.data),
    enabled: !!id,
  });

  const { data: lecturas } = useQuery<LecturasMes>({
    queryKey: ["lecturas", mes],
    queryFn: () =>
      api.get("/admin/lecturas", { params: { mes } }).then((r) => r.data).catch(() => ({ luz: [], agua: [] })),
  });

  const mutContrato = useMutation({
    mutationFn: (data: object) =>
      api.put(`/admin/contratos/${contratoActivo!.id}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["local", id] });
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

  if (isLoading) return <div className="p-6 text-sm text-ink-2">Cargando…</div>;
  if (!local) return <div className="p-6 text-sm text-warn">Local no encontrado</div>;

  const contratoActivo = local.contratos.find((c) => c.activo);
  const arrendatario = contratoActivo?.arrendatario;
  const facturas12 = local.facturas.slice(0, 13).reverse();
  const facturaDelMes = local.facturas.find((f) => f.mes === mes) ?? local.facturas[0];

  const luzMes = lecturas?.luz.find((l) => l.localId === id);
  const aguaMes = lecturas?.agua.find((l) => l.localId === id);

  const openEditContrato = () => {
    if (!contratoActivo) return;
    setModalContrato({
      ufM2Arriendo: String(contratoActivo.ufM2Arriendo ?? ""),
      ufM2Gc: String(contratoActivo.ufM2Gc ?? ""),
      ufM2Terraza: contratoActivo.ufM2Terraza != null ? String(contratoActivo.ufM2Terraza) : "",
      ufM2GcTerraza: contratoActivo.ufM2GcTerraza != null ? String(contratoActivo.ufM2GcTerraza) : "",
      precioFijoArriendo: contratoActivo.precioFijoArriendo != null ? String(contratoActivo.precioFijoArriendo) : "",
      precioFijoGc: contratoActivo.precioFijoGc != null ? String(contratoActivo.precioFijoGc) : "",
      fondoPromo: contratoActivo.fondoPromo != null ? String(contratoActivo.fondoPromo) : "",
      vigenciaHasta: contratoActivo.vigenciaHasta ? contratoActivo.vigenciaHasta.slice(0, 10) : "",
    });
  };

  return (
    <div className="p-6 space-y-5 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-card bg-accent-soft flex items-center justify-center">
            <Building2 size={20} className="text-accent" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-ink font-mono">{local.codigo}</h1>
              {facturaDelMes && <StatusBadge estado={facturaDelMes.estado} />}
            </div>
            <p className="text-sm text-ink-2">{categoriaLabel[local.categoria]} · {local.m2} m²</p>
          </div>
        </div>
        <input
          type="month"
          value={mes}
          onChange={(e) => setMes(e.target.value)}
          className="border border-border rounded-component px-3 py-1.5 text-sm text-ink bg-white focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Contrato */}
        <div className="bg-white border border-border rounded-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-ink flex items-center gap-2"><User size={16} /> Contrato activo</h3>
            {contratoActivo && (
              <button onClick={openEditContrato} className="text-ink-2 hover:text-accent transition-colors flex items-center gap-1 text-xs">
                <Pencil size={13} /> Editar
              </button>
            )}
          </div>
          {arrendatario ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-ink-2">Arrendatario</span>
                <span className="font-medium text-ink">{arrendatario.razonSocial}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-2">RUT</span>
                <span className="font-mono">{arrendatario.rut}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-2">Email</span>
                <span className="font-mono text-xs">{arrendatario.email}</span>
              </div>
              {arrendatario.telefono && (
                <div className="flex justify-between">
                  <span className="text-ink-2">Teléfono</span>
                  <span>{arrendatario.telefono}</span>
                </div>
              )}
              {contratoActivo && (
                <>
                  <hr className="border-border" />
                  <div className="flex justify-between">
                    <span className="text-ink-2">UF/m² Arriendo</span>
                    <span className="font-mono">{contratoActivo.precioFijoArriendo != null ? `${contratoActivo.precioFijoArriendo} UF fijo` : contratoActivo.ufM2Arriendo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-2">UF/m² GC</span>
                    <span className="font-mono">{contratoActivo.precioFijoGc != null ? `${contratoActivo.precioFijoGc} UF fijo` : contratoActivo.ufM2Gc}</span>
                  </div>
                  {contratoActivo.ufM2Terraza != null && (
                    <div className="flex justify-between">
                      <span className="text-ink-2">UF/m² Terraza</span>
                      <span className="font-mono">{contratoActivo.ufM2Terraza}</span>
                    </div>
                  )}
                  {contratoActivo.fondoPromo != null && (
                    <div className="flex justify-between">
                      <span className="text-ink-2">Servicios ALR (Fondo Promo)</span>
                      <span className="font-mono">{contratoActivo.fondoPromo} UF</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-ink-2">Vigencia</span>
                    <span className="text-xs">
                      {formatFecha(contratoActivo.vigenciaDesde)} — {contratoActivo.vigenciaHasta ? formatFecha(contratoActivo.vigenciaHasta) : "indefinido"}
                    </span>
                  </div>
                </>
              )}
            </div>
          ) : (
            <p className="text-sm text-ink-2 italic">Sin contrato activo — local vacío</p>
          )}
        </div>

        {/* Lecturas del mes */}
        <div className="bg-white border border-border rounded-card p-5 space-y-3">
          <h3 className="font-semibold text-ink text-sm">Lecturas — {formatMes(mes)}</h3>

          {/* Luz */}
          <div className="border border-border rounded-component p-3 text-xs space-y-1">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-ink flex items-center gap-1"><Zap size={11} /> Luz</p>
              <button
                onClick={() => setModalLuz({ costoAfecto: luzMes?.costoAfecto != null ? String(Math.round(luzMes.costoAfecto)) : "0", costoExento: luzMes?.costoExento != null ? String(Math.round(luzMes.costoExento)) : "0" })}
                className="text-ink-2 hover:text-accent transition-colors flex items-center gap-1"
              >
                <Pencil size={12} /> Editar
              </button>
            </div>
            {luzMes?.costoAfecto != null || luzMes?.costoExento != null ? (
              <div className="space-y-1 mt-1">
                <div className="flex justify-between">
                  <span className="text-ink-2">Afecto IVA</span>
                  <span className="font-mono">{clp(Math.round(luzMes.costoAfecto ?? 0))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-2">Exento IVA</span>
                  <span className="font-mono">{clp(Math.round(luzMes.costoExento ?? 0))}</span>
                </div>
                <div className="flex justify-between font-semibold border-t border-border pt-1 mt-1">
                  <span className="text-ink">Total luz</span>
                  <span className="font-mono text-accent">{clp(Math.round((luzMes.costoAfecto ?? 0) + (luzMes.costoExento ?? 0)))}</span>
                </div>
              </div>
            ) : (
              <p className="italic text-ink-2 mt-1">Sin datos SCADA para este mes</p>
            )}
          </div>

          {/* Agua */}
          <div className="border border-border rounded-component p-3 text-xs space-y-1">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-ink">Agua</p>
              <button
                onClick={() => setModalAgua({ costoTotal: aguaMes?.costoTotal != null ? String(Math.round(aguaMes.costoTotal)) : "0" })}
                className="text-ink-2 hover:text-accent transition-colors flex items-center gap-1"
              >
                <Pencil size={12} /> Editar
              </button>
            </div>
            {aguaMes?.costoTotal != null ? (
              <div className="flex justify-between font-semibold mt-1">
                <span className="text-ink">Total agua</span>
                <span className="font-mono text-accent">{clp(Math.round(aguaMes.costoTotal))}</span>
              </div>
            ) : (
              <p className="italic text-ink-2 mt-1">Sin datos para este mes</p>
            )}
          </div>
        </div>
      </div>

      {/* Factura del mes */}
      {facturaDelMes && (
        <div className="bg-white border border-border rounded-card p-5 space-y-3">
          <h3 className="font-semibold text-ink flex items-center gap-2"><FileText size={16} /> Factura — {formatMes(facturaDelMes.mes)}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Object.entries({
              Arriendo: facturaDelMes.itemsJson?.arriendo,
              "Gastos Comunes": facturaDelMes.itemsJson?.gastosComunales,
              Luz: facturaDelMes.itemsJson?.luz,
              Agua: facturaDelMes.itemsJson?.agua,
              Multas: facturaDelMes.itemsJson?.multas,
              Descuentos: facturaDelMes.itemsJson?.descuentos ? -facturaDelMes.itemsJson.descuentos : undefined,
              "Saldo anterior": facturaDelMes.itemsJson?.saldoAnterior,
            })
              .filter(([, v]) => v !== undefined && v !== 0)
              .map(([label, value]) => (
                <div key={label} className="flex justify-between text-sm border-b border-border/40 pb-1">
                  <span className="text-ink-2">{label}</span>
                  <span className={`font-mono ${(value as number) < 0 ? "text-ok" : ""}`}>{clp(value as number)}</span>
                </div>
              ))}
          </div>
          <div className="flex justify-between items-center pt-2">
            <div className="text-sm text-ink-2">
              Subtotal {clp(facturaDelMes.subtotal)} + IVA {clp(facturaDelMes.iva)}
            </div>
            <div className="font-semibold text-lg font-mono text-accent">{clp(facturaDelMes.total)}</div>
          </div>
        </div>
      )}

      {/* Historial 12m */}
      <div className="bg-white border border-border rounded-card p-5">
        <h3 className="font-semibold text-ink mb-4">Historial de facturación (12 meses)</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={facturas12.map((f) => ({ mes: f.mes.slice(5), total: f.total, estado: f.estado }))}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EBE6DF" />
            <XAxis dataKey="mes" tick={{ fontSize: 10, fill: "#6B635A" }} />
            <YAxis tick={{ fontSize: 10, fill: "#6B635A" }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: number) => clp(v)} />
            <Bar dataKey="total" fill="#4A8A95" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Timeline eventos */}
      {facturaDelMes?.eventos && facturaDelMes.eventos.length > 0 && (
        <div className="bg-white border border-border rounded-card p-5">
          <h3 className="font-semibold text-ink mb-3 flex items-center gap-2"><Clock size={16} /> Eventos</h3>
          <div className="space-y-3">
            {facturaDelMes.eventos.map((ev) => (
              <div key={ev.id} className="flex items-start gap-3 text-sm">
                <div className="w-2 h-2 rounded-full bg-accent mt-1.5 shrink-0" />
                <div>
                  <span className="font-medium text-ink capitalize">{ev.tipo.replace(/_/g, " ")}</span>
                  <span className="text-ink-2 ml-2 text-xs">{ev.actor}</span>
                  <p className="text-xs text-ink-2">{formatFecha(ev.at)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Contrato */}
      {modalContrato && contratoActivo && (
        <Modal title={`Editar contrato — ${local.codigo}`} onClose={() => setModalContrato(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              mutContrato.mutate({
                ufM2Arriendo: modalContrato.ufM2Arriendo,
                ufM2Gc: modalContrato.ufM2Gc,
                ufM2Terraza: modalContrato.ufM2Terraza,
                ufM2GcTerraza: modalContrato.ufM2GcTerraza,
                precioFijoArriendo: modalContrato.precioFijoArriendo,
                precioFijoGc: modalContrato.precioFijoGc,
                fondoPromo: modalContrato.fondoPromo,
                vigenciaHasta: modalContrato.vigenciaHasta,
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
                    value={modalContrato[key]}
                    onChange={(e) => setModalContrato({ ...modalContrato, [key]: e.target.value })}
                    className="mt-1 w-full border border-border rounded-component px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                </label>
              ))}
              <label className="block">
                <span className="text-xs text-ink-2">Vigencia hasta</span>
                <input
                  type="date"
                  value={modalContrato.vigenciaHasta}
                  onChange={(e) => setModalContrato({ ...modalContrato, vigenciaHasta: e.target.value })}
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
        <Modal title={`Costo luz — ${local.codigo} — ${formatMes(mes)}`} onClose={() => setModalLuz(null)} size="sm">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              mutLuz.mutate({ localId: id, mes, costoAfecto: Number(modalLuz.costoAfecto), costoExento: Number(modalLuz.costoExento) });
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
        <Modal title={`Costo agua — ${local.codigo} — ${formatMes(mes)}`} onClose={() => setModalAgua(null)} size="sm">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              mutAgua.mutate({ localId: id, mes, costoTotal: Number(modalAgua.costoTotal) });
            }}
            className="space-y-3"
          >
            <label className="block">
              <span className="text-xs text-ink-2">Costo total agua ($)</span>
              <input
                type="number"
                value={modalAgua.costoTotal}
                onChange={(e) => setModalAgua({ costoTotal: e.target.value })}
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
