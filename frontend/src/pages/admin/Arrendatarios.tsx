import { useState, FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Mail, Phone, Pencil, Trash2 } from "lucide-react";
import api from "@/lib/api";
import { Modal } from "@/components/shared/Modal";

interface Arrendatario {
  id: string;
  rut: string;
  razonSocial: string;
  nombreComercial?: string;
  email: string;
  emailSecundario?: string;
  telefono?: string;
}

const emptyForm = { rut: "", razonSocial: "", nombreComercial: "", email: "", emailSecundario: "", telefono: "" };

export default function Arrendatarios() {
  const qc = useQueryClient();
  const [busqueda, setBusqueda] = useState("");
  const [modal, setModal] = useState<"crear" | "editar" | null>(null);
  const [seleccionado, setSeleccionado] = useState<Arrendatario | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Arrendatario | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [apiError, setApiError] = useState("");

  const { data: arrendatarios = [], isLoading } = useQuery<Arrendatario[]>({
    queryKey: ["arrendatarios"],
    queryFn: () => api.get("/admin/arrendatarios").then((r) => r.data),
  });

  const crearM = useMutation({
    mutationFn: (data: typeof emptyForm) => api.post("/admin/arrendatarios", data).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["arrendatarios"] }); cerrar(); },
    onError: (e: any) => setApiError(e.response?.data?.error ?? "Error al crear"),
  });

  const editarM = useMutation({
    mutationFn: (data: typeof emptyForm) =>
      api.put(`/admin/arrendatarios/${seleccionado!.id}`, data).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["arrendatarios"] }); cerrar(); },
    onError: (e: any) => setApiError(e.response?.data?.error ?? "Error al guardar"),
  });

  const eliminarM = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/arrendatarios/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["arrendatarios"] }); setConfirmDelete(null); },
    onError: (e: any) => setApiError(e.response?.data?.error ?? "Error al eliminar"),
  });

  const filtrados = arrendatarios.filter(
    (a) =>
      !busqueda ||
      a.razonSocial.toLowerCase().includes(busqueda.toLowerCase()) ||
      a.rut.includes(busqueda) ||
      a.email.toLowerCase().includes(busqueda.toLowerCase()),
  );

  function abrirCrear() {
    setForm(emptyForm);
    setSeleccionado(null);
    setApiError("");
    setModal("crear");
  }

  function abrirEditar(a: Arrendatario) {
    setForm({
      rut: a.rut,
      razonSocial: a.razonSocial,
      nombreComercial: a.nombreComercial ?? "",
      email: a.email,
      emailSecundario: a.emailSecundario ?? "",
      telefono: a.telefono ?? "",
    });
    setSeleccionado(a);
    setApiError("");
    setModal("editar");
  }

  function cerrar() {
    setModal(null);
    setApiError("");
  }

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-ink">Arrendatarios</h1>
            <p className="text-sm text-ink-2">{arrendatarios.length} registrados</p>
          </div>
          <button
            onClick={abrirCrear}
            className="flex items-center gap-2 bg-accent hover:bg-accent/90 text-white text-sm font-medium px-4 py-2 rounded-component transition-colors"
          >
            <Plus size={15} /> Nuevo arrendatario
          </button>
        </div>

        <input
          placeholder="Buscar por nombre, RUT o email…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="border border-border rounded-component px-3 py-1.5 text-sm w-72 focus:outline-none focus:ring-2 focus:ring-accent/30"
        />

        <div className="bg-white border border-border rounded-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-paper-2 text-xs text-ink-2 uppercase tracking-wide">
                <th className="text-left px-4 py-3">RUT</th>
                <th className="text-left px-4 py-3">Razón social</th>
                <th className="text-left px-4 py-3">Nombre comercial</th>
                <th className="text-left px-4 py-3">Contacto</th>
                <th className="px-4 py-3 w-20" />
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-ink-2">Cargando…</td></tr>
              )}
              {filtrados.map((a) => (
                <tr key={a.id} className="border-b border-border/60 hover:bg-paper-2/50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs">{a.rut}</td>
                  <td className="px-4 py-3 font-medium text-ink">{a.razonSocial}</td>
                  <td className="px-4 py-3 text-xs text-ink-2">{a.nombreComercial ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="flex items-center gap-1 text-xs text-ink-2">
                        <Mail size={11} /> {a.email}
                      </span>
                      {a.telefono && (
                        <span className="flex items-center gap-1 text-xs text-ink-2">
                          <Phone size={11} /> {a.telefono}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => abrirEditar(a)}
                        className="text-ink-2 hover:text-accent transition-colors"
                        title="Editar"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => { setApiError(""); setConfirmDelete(a); }}
                        className="text-ink-2 hover:text-red-500 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!isLoading && filtrados.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-ink-2">Sin resultados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal crear / editar */}
      {modal && (
        <Modal
          title={modal === "crear" ? "Nuevo arrendatario" : "Editar arrendatario"}
          onClose={cerrar}
        >
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-ink-2">RUT *</label>
                <input
                  value={form.rut}
                  onChange={(e) => set("rut", e.target.value)}
                  placeholder="12.345.678-9"
                  required
                  className="border border-border rounded-component px-3 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-ink-2">Nombre comercial</label>
                <input
                  value={form.nombreComercial}
                  onChange={(e) => set("nombreComercial", e.target.value)}
                  placeholder="Nombre del local"
                  className="border border-border rounded-component px-3 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-ink-2">Razón social *</label>
              <input
                value={form.razonSocial}
                onChange={(e) => set("razonSocial", e.target.value)}
                placeholder="EMPRESA LTDA"
                required
                className="border border-border rounded-component px-3 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-ink-2">Email *</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="contacto@empresa.cl"
                required
                className="border border-border rounded-component px-3 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-ink-2">Email secundario</label>
                <input
                  type="email"
                  value={form.emailSecundario}
                  onChange={(e) => set("emailSecundario", e.target.value)}
                  placeholder="otro@empresa.cl"
                  className="border border-border rounded-component px-3 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-ink-2">Teléfono</label>
                <input
                  value={form.telefono}
                  onChange={(e) => set("telefono", e.target.value)}
                  placeholder="+56 9 1234 5678"
                  className="border border-border rounded-component px-3 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </div>
            </div>

            {apiError && (
              <p className="text-xs text-red-600 bg-red-50 rounded-component px-3 py-2">{apiError}</p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={cerrar}
                className="px-4 py-2 text-sm text-ink-2 hover:text-ink rounded-component transition-colors"
              >
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
        <Modal title="Eliminar arrendatario" onClose={() => setConfirmDelete(null)} size="sm">
          <div className="space-y-4">
            <p className="text-sm text-ink">
              ¿Eliminar a <span className="font-semibold">{confirmDelete.razonSocial}</span>?
              Esta acción no se puede deshacer.
            </p>
            {apiError && (
              <p className="text-xs text-red-600 bg-red-50 rounded-component px-3 py-2">{apiError}</p>
            )}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 text-sm text-ink-2 hover:text-ink rounded-component transition-colors"
              >
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
