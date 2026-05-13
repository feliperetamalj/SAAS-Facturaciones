import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useMutation } from "@tanstack/react-query";
import { Upload, CheckCircle, AlertTriangle, X, FileSpreadsheet, Building2 } from "lucide-react";
import api from "@/lib/api";

interface DetalleImport {
  codigo: string;
  nombre: string | null;
  accion: string;
}

interface ImportResult {
  procesados: number;
  creados: number;
  actualizados: number;
  sinContrato: number;
  errores: string[];
  detalle: DetalleImport[];
}

export default function ImportarLocales() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  const mutation = useMutation<ImportResult, Error, File>({
    mutationFn: async (f) => {
      const fd = new FormData();
      fd.append("archivo", f);
      const { data } = await api.post<ImportResult>("/admin/locales/import-excel", fd);
      return data;
    },
    onSuccess: (data) => setResult(data),
  });

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) { setFile(accepted[0]); setResult(null); }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
    },
    maxFiles: 1,
  });

  function reset() { setFile(null); setResult(null); mutation.reset(); }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold text-ink">Añadir locales / Arrendatarios</h1>
        <p className="text-sm text-ink-2">Carga el Excel maestro para registrar o actualizar locales y contratos</p>
      </div>

      {/* Formato esperado */}
      <div className="bg-accent-soft/30 border border-accent/20 rounded-card p-4 text-sm space-y-2">
        <p className="font-medium text-accent">Columnas requeridas en el Excel</p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-ink-2">
          {[
            ["Local", "Código del local (ej. L101, 120-A)"],
            ["Piso", "Piso 1 / Piso 2 / Mercadito"],
            ["Arrendatario", "Razón social"],
            ["Nombre", "Nombre comercial"],
            ["RUT", "RUT del arrendatario"],
            ["Giro", "Giro comercial"],
            ["m^2 Arrendados", "Metros cuadrados"],
            ["m^2 Terraza", "Terraza (opcional)"],
            ["Uf/m^2 Arriendo", "Tarifa arriendo o 'Precio Fijo'"],
            ["Uf/m^2 (Gastos Comunes)", "Tarifa GC o 'Precio Fijo'"],
            ["Fondo Promo Uf", "Aporte fondo de promoción"],
            ["Precio Fijo Arriendo (UF)", "Para locales con precio fijo"],
            ["Precio Fijo GGCC (UF)", "Para locales con precio fijo"],
          ].map(([col, desc]) => (
            <div key={col} className="flex gap-1.5">
              <code className="font-mono bg-white px-1 rounded shrink-0">{col}</code>
              <span>{desc}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-ink-2 pt-1">
          Locales con «DISPONIBLE» o sin RUT se crean como vacíos. Los existentes se actualizan.
        </p>
      </div>

      {/* Dropzone */}
      <div className="bg-white border border-border rounded-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <FileSpreadsheet size={20} className="text-accent" />
          <h3 className="font-semibold text-ink">Archivo Excel</h3>
        </div>

        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-card p-10 text-center cursor-pointer transition-colors ${
            isDragActive ? "border-accent bg-accent-soft/30" : "border-border hover:border-accent/50 bg-paper"
          }`}
        >
          <input {...getInputProps()} />
          <Upload size={32} className="mx-auto mb-2 text-ink-2" />
          {file ? (
            <div>
              <p className="text-sm font-medium text-ink">{file.name}</p>
              <p className="text-xs text-ink-2">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
          ) : (
            <div>
              <p className="text-sm text-ink">Arrastra el Excel aquí o haz clic para seleccionar</p>
              <p className="text-xs text-ink-2 mt-1">.xlsx · .xls · máx 10 MB</p>
            </div>
          )}
        </div>

        {file && !result && (
          <div className="flex gap-2">
            <button
              onClick={() => mutation.mutate(file)}
              disabled={mutation.isPending}
              className="flex-1 bg-accent hover:bg-accent/90 disabled:opacity-60 text-white text-sm font-medium py-2 rounded-component transition-colors flex items-center justify-center gap-2"
            >
              <Building2 size={15} />
              {mutation.isPending ? "Importando…" : "Importar locales y arrendatarios"}
            </button>
            <button onClick={reset} className="p-2 border border-border rounded-component hover:bg-paper-2 transition-colors">
              <X size={16} className="text-ink-2" />
            </button>
          </div>
        )}

        {mutation.isError && (
          <div className="bg-warn-soft border border-warn/30 rounded-component px-3 py-2 text-sm text-warn">
            Error: {mutation.error.message}
          </div>
        )}
      </div>

      {/* Resultado */}
      {result && (
        <div className="bg-white border border-border rounded-card p-5 space-y-4">
          <h3 className="font-semibold text-ink">Resultado de la importación</h3>

          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Procesados", value: result.procesados, color: "text-ink" },
              { label: "Creados",    value: result.creados,    color: "text-ok" },
              { label: "Actualizados", value: result.actualizados, color: "text-accent" },
              { label: "Sin contrato", value: result.sinContrato, color: "text-ink-2" },
            ].map(({ label, value, color }) => (
              <div key={label} className="border border-border rounded-component p-3 text-center">
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-ink-2 mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Errores */}
          {result.errores.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-component p-3 space-y-1">
              <p className="text-xs font-medium text-red-600 flex items-center gap-1">
                <AlertTriangle size={12} /> {result.errores.length} error(es)
              </p>
              {result.errores.map((e, i) => <p key={i} className="text-xs text-red-500">{e}</p>)}
            </div>
          )}

          {/* Detalle */}
          <div className="max-h-72 overflow-y-auto rounded-component border border-border">
            <table className="w-full text-xs">
              <thead className="bg-paper-2 sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2 text-ink-2">Local</th>
                  <th className="text-left px-3 py-2 text-ink-2">Nombre</th>
                  <th className="text-left px-3 py-2 text-ink-2">Acción</th>
                </tr>
              </thead>
              <tbody>
                {result.detalle.map((d, i) => (
                  <tr key={i} className="border-t border-border/60">
                    <td className="px-3 py-1.5 font-mono font-medium text-accent">{d.codigo}</td>
                    <td className="px-3 py-1.5 text-ink">{d.nombre ?? "—"}</td>
                    <td className="px-3 py-1.5">
                      <span className={`inline-flex items-center gap-1 ${d.accion.includes("creado") ? "text-ok" : "text-accent"}`}>
                        <CheckCircle size={11} /> {d.accion}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button onClick={reset} className="text-xs text-ink-2 hover:text-ink underline">
            Importar otro archivo
          </button>
        </div>
      )}
    </div>
  );
}
