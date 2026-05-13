import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { FileDown, Upload, TrendingUp, TrendingDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { clp, formatMes, formatFecha } from "@/lib/utils";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { TenantHeader } from "@/components/shared/TenantHeader";
import { Factura } from "@/types";
import api from "@/lib/api";

interface LocalBasico {
  id: string;
  codigo: string;
  m2: number;
  contratos: Array<{ arrendatario?: { razonSocial: string } }>;
}

function LocalPicker({ onSelect }: { onSelect: (id: string, codigo: string) => void }) {
  const navigate = useNavigate();
  const { data: locales = [], isLoading } = useQuery<LocalBasico[]>({
    queryKey: ["tenant-locales"],
    queryFn: () => api.get("/tenant/locales").then((r) => r.data),
  });

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <TenantHeader title="Vista Arrendatario" onBack={() => navigate("/")} />
      <div className="max-w-md mx-auto px-4 py-8 w-full">
        <div className="text-center mb-6">
          <h2 className="text-base font-semibold text-ink">¿Qué local deseas ver?</h2>
          <p className="text-sm text-ink-2 mt-1">Selecciona un local para ver su factura</p>
        </div>
        {isLoading && <p className="text-sm text-ink-2 text-center">Cargando locales…</p>}
        <div className="space-y-2">
          {locales.map((l) => (
            <button
              key={l.id}
              onClick={() => onSelect(l.id, l.codigo)}
              className="w-full bg-white border border-border rounded-card px-4 py-3 text-left hover:border-accent/50 hover:bg-accent-soft/10 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-mono text-sm font-semibold text-accent">{l.codigo}</span>
                  <p className="text-xs text-ink-2 mt-0.5">
                    {l.contratos[0]?.arrendatario?.razonSocial ?? "Sin arrendatario"} · {l.m2} m²
                  </p>
                </div>
                <TrendingUp size={14} className="text-ink-2 opacity-40" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function FacturaView({ localId, localCodigo, onBack }: { localId: string; localCodigo: string; onBack: () => void }) {
  const mesCurrent = new Date().toISOString().slice(0, 7);

  // Un solo query — facturaActual se deriva del historial
  const { data: historial = [] } = useQuery<Factura[]>({
    queryKey: ["tenant-historial", localId],
    queryFn: () => api.get(`/tenant/facturas?localId=${localId}`).then((r) => r.data),
  });

  const facturaActual = historial.find((f) => f.mes === mesCurrent) ?? null;
  const mesAnterior = historial.find((f) => f.mes < mesCurrent);
  const ultimas6 = historial.slice(0, 6).reverse();

  const variacionTotal =
    facturaActual && mesAnterior
      ? ((facturaActual.total - mesAnterior.total) / mesAnterior.total) * 100
      : null;

  const desgloseItems: [string, number][] = facturaActual
    ? ([
        ["Arriendo",       facturaActual.itemsJson?.arriendo],
        ["Gastos Comunes", facturaActual.itemsJson?.gastosComunales],
        ["Luz",            facturaActual.itemsJson?.luz],
        ["Agua",           facturaActual.itemsJson?.agua],
        ["Multas",         facturaActual.itemsJson?.multas],
        ["Descuentos",     facturaActual.itemsJson?.descuentos ? -facturaActual.itemsJson.descuentos : null],
        ["Saldo anterior", facturaActual.itemsJson?.saldoAnterior],
      ] as [string, number | null | undefined][]).filter((row): row is [string, number] => row[1] != null && row[1] !== 0)
    : [];

  const headerActions = facturaActual ? <StatusBadge estado={facturaActual.estado} /> : undefined;

  return (
    <div className="min-h-screen bg-paper">
      <TenantHeader title={`Local ${localCodigo}`} onBack={onBack} sticky actions={headerActions} />

      <div className="max-w-md mx-auto px-4 py-5 space-y-4">
        {facturaActual ? (
          <>
            {/* Hero */}
            <div className="bg-accent rounded-card p-6 text-white text-center space-y-1">
              <p className="text-sm opacity-80">Factura {formatMes(facturaActual.mes)}</p>
              <p className="font-mono text-4xl font-bold">{clp(facturaActual.total)}</p>
              {facturaActual.vencimiento && (
                <p className="text-sm opacity-70">Vence: {formatFecha(facturaActual.vencimiento)}</p>
              )}
              {variacionTotal !== null && (
                <p className={`text-xs font-medium flex items-center justify-center gap-1 mt-1 ${variacionTotal > 0 ? "text-warn-soft" : "text-ok-soft"}`}>
                  {variacionTotal > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {Math.abs(variacionTotal).toFixed(1)}% vs mes anterior
                </p>
              )}
            </div>

            {/* Acciones */}
            <div className="grid grid-cols-2 gap-3">
              <button className="flex items-center justify-center gap-2 bg-white border border-border rounded-card py-3 text-sm font-medium text-ink hover:bg-paper-2 transition-colors">
                <FileDown size={16} className="text-accent" /> Descargar PDF
              </button>
              <button className="flex items-center justify-center gap-2 bg-white border border-border rounded-card py-3 text-sm font-medium text-ink hover:bg-paper-2 transition-colors">
                <Upload size={16} className="text-accent" /> Subir comprobante
              </button>
            </div>

            {/* Desglose */}
            <div className="bg-white border border-border rounded-card p-4 space-y-3">
              <h3 className="text-sm font-semibold text-ink">Desglose</h3>
              {desgloseItems.map(([label, value]) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-ink-2">{label}</span>
                  <span className={`font-mono ${value < 0 ? "text-ok" : "text-ink"}`}>{clp(value)}</span>
                </div>
              ))}
              <hr className="border-border" />
              <div className="flex justify-between text-sm text-ink-2">
                <span>Subtotal</span><span className="font-mono">{clp(facturaActual.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-ink-2">
                <span>IVA (19%)</span><span className="font-mono">{clp(facturaActual.iva)}</span>
              </div>
              <div className="flex justify-between font-semibold text-ink">
                <span>Total</span><span className="font-mono text-accent">{clp(facturaActual.total)}</span>
              </div>
            </div>

            {/* Historial 6 meses */}
            {ultimas6.length > 1 && (
              <div className="bg-white border border-border rounded-card p-4">
                <h3 className="text-sm font-semibold text-ink mb-3">Últimos {ultimas6.length} meses</h3>
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={ultimas6.map((f) => ({ mes: f.mes.slice(5), total: f.total }))}>
                    <XAxis dataKey="mes" tick={{ fontSize: 9, fill: "#6B635A" }} />
                    <YAxis hide />
                    <Tooltip formatter={(v: number) => clp(v)} />
                    <Bar dataKey="total" fill="#4A8A95" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        ) : (
          <div className="bg-white border border-border rounded-card p-8 text-center">
            <p className="text-sm font-medium text-ink">Sin factura para este mes</p>
            <p className="text-xs text-ink-2 mt-1">El administrador aún no ha generado el lote</p>
          </div>
        )}

        {/* Historial */}
        {historial.length > 0 && (
          <div className="bg-white border border-border rounded-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <h3 className="text-sm font-semibold text-ink">Historial de facturas</h3>
            </div>
            {historial.map((f) => (
              <div key={f.id} className="flex items-center justify-between px-4 py-3 border-b border-border/60 last:border-0">
                <div>
                  <p className="text-sm text-ink">{formatMes(f.mes)}</p>
                  <StatusBadge estado={f.estado} className="mt-0.5" />
                </div>
                <span className="font-mono text-sm font-medium text-ink">{clp(f.total)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function TenantFactura() {
  const [seleccion, setSeleccion] = useState<{ id: string; codigo: string } | null>(null);

  if (!seleccion) {
    return <LocalPicker onSelect={(id, codigo) => setSeleccion({ id, codigo })} />;
  }

  return (
    <FacturaView
      localId={seleccion.id}
      localCodigo={seleccion.codigo}
      onBack={() => setSeleccion(null)}
    />
  );
}
