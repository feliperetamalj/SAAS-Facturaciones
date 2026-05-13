import { useState, useMemo, FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { categoriaLabel } from "@/lib/utils";
import api from "@/lib/api";
import { Modal } from "@/components/shared/Modal";

interface Arrendatario {
  id: string;
  rut: string;
  razonSocial: string;
  nombreComercial?: string;
  email: string;
}

interface ContratoActivo {
  arrendatario: Arrendatario;
}

interface LocalRow {
  id: string;
  codigo: string;
  nombre?: string;
  m2: number;
  m2Terraza?: number | null;
  categoria: string;
  estado: string;
  piso?: string;
  contratos: ContratoActivo[];
}

interface Grupo {
  arrendatario: Arrendatario | null;
  locales: LocalRow[];
}

const estadoStyle: Record<string, string> = {
  activo:   "bg-ok-soft text-ok",
  vacio:    "bg-paper-2 text-ink-2",
  inactivo: "bg-warn-soft text-warn",
};

const estadoLabel: Record<string, string> = {
  activo: "Activo", vacio: "Disponible", inactivo: "Inactivo",
};

const emptyForm = {
  codigo: "", nombre: "", m2: "", m2Terraza: "",
  categoria: "PISO_1", piso: "1", estado: "activo",
};

function FilaLocal({ l, onEditar, onEliminar }: { l: LocalRow; onEditar: (l: LocalRow) => void; onEliminar: (l: LocalRow) => void }) {
  return (
    <>
      <td className="px-4 py-3">
        <span className="font-mono font-bold text-accent">{l.codigo}</span>
        <span className="block text-xs text-ink-2 mt-0.5">{categoriaLabel[l.categoria] ?? l.categoria}</span>
      </td>
      <td className="px-4 py-3 text-sm text-ink">{l.nombre ?? <span className="italic text-ink-2">—</span>}</td>
      <td className="px-4 py-3 text-right font-mono text-sm">{l.m2} m²</td>
      <td className="px-4 py-3 text-right font-mono text-sm">
        {l.m2Terraza != null ? <>{l.m2Terraza} m²</> : <span className="italic text-ink-2 text-xs">No Aplica</span>}
      </td>
      <td className="px-4 py-3 text-center">
        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${estadoStyle[l.estado] ?? "bg-paper-2 text-ink-2"}`}>
          {estadoLabel[l.estado] ?? l.estado}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2 justify-end">
          <button onClick={() => onEditar(l)} className="text-ink-2 hover:text-accent transition-colors" title="Editar"><Pencil size={14} /></button>
          <button onClick={() => onEliminar(l)} className="text-ink-2 hover:text-red-500 transition-colors" title="Eliminar"><Trash2 size={14} /></button>
        </div>
      </td>
    </>
  );
}

export default function Locales() {
  const qc = useQueryClient();
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [modal, setModal] = useState<"crear" | "editar" | null>(null);
  const [seleccionado, setSeleccionado] = useState<LocalRow | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<LocalRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [apiError, setApiError] = useState("");

  const { data: locales = [], isLoading } = useQuery<LocalRow[]>({
    queryKey: ["locales"],
    queryFn: () => api.get("/admin/locales").then((r) => r.data),
  });

  const crearM = useMutation({
    mutationFn: (data: typeof emptyForm) => api.post("/admin/locales", data).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["locales"] }); cerrar(); },
    onError: (e: any) => setApiError(e.response?.data?.error ?? "Error al crear"),
  });

  const editarM = useMutation({
    mutationFn: (data: typeof emptyForm) =>
      api.put(`/admin/locales/${seleccionado!.id}`, data).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["locales"] }); cerrar(); },
    onError: (e: any) => setApiError(e.response?.data?.error ?? "Error al guardar"),
  });

  const eliminarM = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/locales/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["locales"] }); setConfirmDelete(null); },
    onError: (e: any) => setApiError(e.response?.data?.error ?? "Error al eliminar"),
  });

  const filtrados = locales.filter((l) => {
    const matchBusq =
      !busqueda ||
      l.codigo.toLowerCase().includes(busqueda.toLowerCase()) ||
      (l.nombre ?? "").toLowerCase().includes(busqueda.toLowerCase()) ||
      (l.contratos[0]?.arrendatario?.razonSocial ?? "").toLowerCase().includes(busqueda.toLowerCase()) ||
      (l.contratos[0]?.arrendatario?.nombreComercial ?? "").toLowerCase().includes(busqueda.toLowerCase());
    const matchEstado = filtroEstado === "todos" || l.estado === filtroEstado;
    return matchBusq && matchEstado;
  });

  const { conContrato, sinContrato, disponibles } = useMemo(() => {
    const mapa = new Map<string, Grupo>();
    const sc: LocalRow[] = [];
    const disp: LocalRow[] = [];

    for (const l of filtrados) {
      const arr = l.contratos[0]?.arrendatario ?? null;
      if (arr) {
        if (!mapa.has(arr.id)) mapa.set(arr.id, { arrendatario: arr, locales: [] });
        mapa.get(arr.id)!.locales.push(l);
      } else if (l.nombre) {
        sc.push(l);
      } else {
        disp.push(l);
      }
    }

    const cc = [...mapa.values()].sort((a, b) => {
      const na = a.arrendatario!.nombreComercial ?? a.arrendatario!.razonSocial;
      const nb = b.arrendatario!.nombreComercial ?? b.arrendatario!.razonSocial;
      return na.localeCompare(nb, "es");
    });

    return { conContrato: cc, sinContrato: sc, disponibles: disp };
  }, [filtrados]);

  function abrirCrear() {
    setForm(emptyForm);
    setSeleccionado(null);
    setApiError("");
    setModal("crear");
  }

  function abrirEditar(l: LocalRow) {
    setForm({
      codigo:    l.codigo,
      nombre:    l.nombre ?? "",
      m2:        String(l.m2),
      m2Terraza: l.m2Terraza != null ? String(l.m2Terraza) : "",
      categoria: l.categoria,
      piso:      l.piso ?? "1",
      estado:    l.estado,
    });
    setSeleccionado(l);
    setApiError("");
    setModal("editar");
  }

  function cerrar() { setModal(null); setApiError(""); }

  function set(field: keyof typeof emptyForm, val: string) {
    setForm((f) => ({ ...f, [field]: val }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setApiError("");
    if (modal === "crear") crearM.mutate(form);
    else editarM.mutate(form);
  }

  const isPending = crearM.isPending || editarM.isPending;

  return (
    <>
      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-ink">Locales</h1>
            <p className="text-sm text-ink-2">
              {locales.length} locales · {conContrato.length} arrendatarios · {sinContrato.length} sin contrato · {disponibles.length} disponibles
            </p>
          </div>
          <button
            onClick={abrirCrear}
            className="flex items-center gap-2 bg-accent hover:bg-accent/90 text-white text-sm font-medium px-4 py-2 rounded-component transition-colors"
          >
            <Plus size={15} /> Nuevo local
          </button>
        </div>

        {/* Filtros */}
        <div className="flex items-center gap-3 flex-wrap">
          <input
            placeholder="Buscar por código, nombre o arrendatario…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="border border-border rounded-component px-3 py-1.5 text-sm w-72 focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
          <div className="flex gap-1">
            {[["todos", "Todos"], ["activo", "Activo"], ["vacio", "Disponible"], ["inactivo", "Inactivo"]].map(([v, label]) => (
              <button
                key={v}
                onClick={() => setFiltroEstado(v)}
                className={`px-3 py-1.5 rounded-component text-xs transition-colors ${filtroEstado === v ? "bg-accent text-white" : "bg-paper-2 text-ink-2 hover:bg-paper"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Tabla */}
        <div className="bg-white border border-border rounded-card overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border bg-paper-2 text-xs text-ink-2 uppercase tracking-wide">
                <th className="text-left px-5 py-3 w-56">Arrendatario</th>
                <th className="text-left px-4 py-3 w-28">N° Local</th>
                <th className="text-left px-4 py-3">Nombre del local</th>
                <th className="text-right px-4 py-3 w-28">m²</th>
                <th className="text-right px-4 py-3 w-28">Terraza</th>
                <th className="text-center px-4 py-3 w-28">Estado</th>
                <th className="px-4 py-3 w-16" />
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-ink-2">Cargando…</td></tr>
              )}

              {/* ── Locales con contrato activo ── */}
              {conContrato.map((grupo, gi) =>
                grupo.locales.map((l, li) => (
                  <tr key={l.id} className={`border-b border-border/50 hover:bg-paper-2/40 transition-colors ${li === 0 && gi > 0 ? "border-t-2 border-t-border" : ""}`}>
                    {li === 0 && (
                      <td rowSpan={grupo.locales.length} className="px-5 py-3 align-top border-r border-border/40">
                        <div>
                          <p className="font-semibold text-ink text-sm leading-snug">
                            {grupo.arrendatario!.nombreComercial ?? grupo.arrendatario!.razonSocial}
                          </p>
                          {grupo.arrendatario!.nombreComercial && (
                            <p className="text-xs text-ink-2 mt-0.5">{grupo.arrendatario!.razonSocial}</p>
                          )}
                          <p className="font-mono text-xs text-ink-2 mt-1">{grupo.arrendatario!.rut}</p>
                        </div>
                      </td>
                    )}
                    <FilaLocal l={l} onEditar={abrirEditar} onEliminar={(l) => { setApiError(""); setConfirmDelete(l); }} />
                  </tr>
                ))
              )}

              {/* ── Separador: Sin contrato formal ── */}
              {sinContrato.length > 0 && (
                <tr className="border-t-2 border-t-border">
                  <td colSpan={7} className="px-5 py-2 bg-amber-50 text-xs font-semibold text-amber-700 uppercase tracking-wide">
                    Sin contrato formal — {sinContrato.length} local{sinContrato.length !== 1 ? "es" : ""}
                  </td>
                </tr>
              )}
              {sinContrato.map((l) => (
                <tr key={l.id} className="border-b border-border/50 hover:bg-amber-50/30 transition-colors">
                  <td className="px-5 py-3 border-r border-border/40">
                    <span className="text-xs italic text-amber-600">Sin contrato</span>
                  </td>
                  <FilaLocal l={l} onEditar={abrirEditar} onEliminar={(l) => { setApiError(""); setConfirmDelete(l); }} />
                </tr>
              ))}

              {/* ── Separador: Disponibles ── */}
              {disponibles.length > 0 && (
                <tr className="border-t-2 border-t-border">
                  <td colSpan={7} className="px-5 py-2 bg-paper-2 text-xs font-semibold text-ink-2 uppercase tracking-wide">
                    Disponibles — {disponibles.length} local{disponibles.length !== 1 ? "es" : ""}
                  </td>
                </tr>
              )}
              {disponibles.map((l) => (
                <tr key={l.id} className="border-b border-border/50 hover:bg-paper-2/40 transition-colors">
                  <td className="px-5 py-3 border-r border-border/40">
                    <span className="text-xs italic text-ink-2">Disponible</span>
                  </td>
                  <FilaLocal l={l} onEditar={abrirEditar} onEliminar={(l) => { setApiError(""); setConfirmDelete(l); }} />
                </tr>
              ))}

              {!isLoading && conContrato.length === 0 && sinContrato.length === 0 && disponibles.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-ink-2">Sin resultados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal crear / editar */}
      {modal && (
        <Modal title={modal === "crear" ? "Nuevo local" : `Editar ${seleccionado?.codigo}`} onClose={cerrar}>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-ink-2">N° Local *</label>
                <input
                  value={form.codigo}
                  onChange={(e) => set("codigo", e.target.value)}
                  placeholder="L101"
                  required
                  className="border border-border rounded-component px-3 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-ink-2">Nombre del local</label>
                <input
                  value={form.nombre}
                  onChange={(e) => set("nombre", e.target.value)}
                  placeholder="Tavelli"
                  className="border border-border rounded-component px-3 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-ink-2">Categoría *</label>
                <select
                  value={form.categoria}
                  onChange={(e) => set("categoria", e.target.value)}
                  className="border border-border rounded-component px-3 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-accent/30 bg-white"
                >
                  <option value="PISO_1">Piso 1</option>
                  <option value="PISO_2">Piso 2</option>
                  <option value="MERCADITO">Mercadito</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-ink-2">Piso</label>
                <select
                  value={form.piso}
                  onChange={(e) => set("piso", e.target.value)}
                  className="border border-border rounded-component px-3 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-accent/30 bg-white"
                >
                  <option value="1">Piso 1</option>
                  <option value="2">Piso 2</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-ink-2">Estado *</label>
                <select
                  value={form.estado}
                  onChange={(e) => set("estado", e.target.value)}
                  className="border border-border rounded-component px-3 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-accent/30 bg-white"
                >
                  <option value="activo">Activo</option>
                  <option value="vacio">Disponible</option>
                  <option value="inactivo">Inactivo</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-ink-2">Superficie contrato (m²) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.m2}
                  onChange={(e) => set("m2", e.target.value)}
                  placeholder="52.03"
                  required
                  className="border border-border rounded-component px-3 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-ink-2">Superficie terraza (m²)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.m2Terraza}
                  onChange={(e) => set("m2Terraza", e.target.value)}
                  placeholder="Dejar vacío si no aplica"
                  className="border border-border rounded-component px-3 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </div>
            </div>

            {apiError && (
              <p className="text-xs text-red-600 bg-red-50 rounded-component px-3 py-2">{apiError}</p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={cerrar} className="px-4 py-2 text-sm text-ink-2 hover:text-ink rounded-component transition-colors">
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="px-4 py-2 text-sm font-medium bg-accent hover:bg-accent/90 disabled:opacity-50 text-white rounded-component transition-colors"
              >
                {isPending ? "Guardando…" : modal === "crear" ? "Crear" : "Guardar cambios"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal confirmar eliminación */}
      {confirmDelete && (
        <Modal title="Eliminar local" onClose={() => setConfirmDelete(null)} size="sm">
          <div className="space-y-4">
            <p className="text-sm text-ink">
              ¿Eliminar el local <span className="font-semibold">{confirmDelete.codigo}</span>
              {confirmDelete.nombre && <> — {confirmDelete.nombre}</>}?
              Esta acción no se puede deshacer.
            </p>
            {apiError && (
              <p className="text-xs text-red-600 bg-red-50 rounded-component px-3 py-2">{apiError}</p>
            )}
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 text-sm text-ink-2 hover:text-ink rounded-component transition-colors">
                Cancelar
              </button>
              <button
                onClick={() => eliminarM.mutate(confirmDelete.id)}
                disabled={eliminarM.isPending}
                className="px-4 py-2 text-sm font-medium bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white rounded-component transition-colors"
              >
                {eliminarM.isPending ? "Eliminando…" : "Eliminar"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
