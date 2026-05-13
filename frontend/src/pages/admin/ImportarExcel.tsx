import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useMutation } from "@tanstack/react-query";
import { Upload, AlertTriangle, CheckCircle, FileSpreadsheet, X } from "lucide-react";
import { useMes } from "@/hooks/useMes";
import api from "@/lib/api";

interface CostoAguaResult {
  codigo: string;
  marca: string;
  costo: number;
}

interface ImportCostosResult {
  mes: string;
  importados: number;
  noEncontrados: string[];
  resultados: CostoAguaResult[];
  diagnostico?: {
    headerRowIdx: number;
    columnas: string[];
    totalFilas: number;
    aguaKey: string | null;
  };
}

interface ScadaResult {
  mes: string;
  importados: number;
  noEncontrados: string[];
  sinDatosEnCsv: string[];
  resultados: { codigo: string; costoAfecto: number; costoExento: number }[];
}

function DropZoneScada({ mes }: { mes: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ScadaResult | null>(null);

  const mutation = useMutation<ScadaResult, Error, File>({
    mutationFn: async (f) => {
      const fd = new FormData();
      fd.append("archivo", f);
      const { data } = await api.post<ScadaResult>(`/admin/lecturas/luz/import-scada?mes=${mes}`, fd);
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
      "text/csv": [".csv"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
    },
    maxFiles: 1,
  });

  const fmt = (n: number) =>
    new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n);

  const totalAfecto = result?.resultados.reduce((s, r) => s + r.costoAfecto, 0) ?? 0;
  const totalExento = result?.resultados.reduce((s, r) => s + r.costoExento, 0) ?? 0;

  return (
    <div className="bg-white border border-border rounded-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <FileSpreadsheet size={20} className="text-amber-500" />
        <h3 className="font-semibold text-ink">Costos de Luz — CSV SCADA</h3>
        <span className="text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full">Informe mensual</span>
      </div>

      <p className="text-xs text-ink-2">
        Carga el informe mensual del SCADA. Se leen las columnas{" "}
        <code className="font-mono bg-paper-2 px-1 rounded">NUMERO LOCAL</code>,{" "}
        <code className="font-mono bg-paper-2 px-1 rounded">FACT. NETO AFECTO IVA</code> y{" "}
        <code className="font-mono bg-paper-2 px-1 rounded">FAC. NETO EXTENTO IVA</code> (valores en CLP).
        Ambos montos se guardan por separado para la facturación.
      </p>

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-card p-6 text-center cursor-pointer transition-colors ${
          isDragActive ? "border-amber-400 bg-amber-50/30" : "border-border hover:border-amber-300 bg-paper"
        }`}
      >
        <input {...getInputProps()} />
        <Upload size={28} className="mx-auto mb-2 text-ink-2" />
        {file ? (
          <div>
            <p className="text-sm font-medium text-ink">{file.name}</p>
            <p className="text-xs text-ink-2">{(file.size / 1024).toFixed(1)} KB</p>
          </div>
        ) : (
          <div>
            <p className="text-sm text-ink">Arrastra el CSV/Excel aquí o haz clic</p>
            <p className="text-xs text-ink-2 mt-1">.csv · .xlsx · .xls · máx 10MB</p>
          </div>
        )}
      </div>

      {file && !result && (
        <div className="flex gap-2">
          <button
            onClick={() => mutation.mutate(file)}
            disabled={mutation.isPending}
            className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white text-sm font-medium py-2 rounded-component transition-colors"
          >
            {mutation.isPending ? "Importando…" : "Importar costos de luz"}
          </button>
          <button
            onClick={() => { setFile(null); setResult(null); }}
            className="p-2 border border-border rounded-component hover:bg-paper-2 transition-colors"
          >
            <X size={16} className="text-ink-2" />
          </button>
        </div>
      )}

      {mutation.isError && (
        <div className="bg-warn-soft border border-warn/30 rounded-component px-3 py-2 text-sm text-warn">
          Error: {mutation.error.message}
        </div>
      )}

      {result && (
        <div className="space-y-3">
          <div className="flex items-center gap-4 text-sm flex-wrap">
            <span className="flex items-center gap-1 text-ok">
              <CheckCircle size={14} /> {result.importados} locales importados
            </span>
            {result.noEncontrados.length > 0 && (
              <span className="flex items-center gap-1 text-warn">
                <AlertTriangle size={14} /> {result.noEncontrados.length} en CSV sin match
              </span>
            )}
            {result.sinDatosEnCsv?.length > 0 && (
              <span className="flex items-center gap-1 text-warn">
                <AlertTriangle size={14} /> {result.sinDatosEnCsv.length} sin datos en CSV
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3 text-xs bg-paper rounded-component p-3">
            <div className="text-center">
              <p className="text-ink-2 mb-0.5">Afecto IVA</p>
              <p className="font-bold text-ink font-mono">{fmt(totalAfecto)}</p>
            </div>
            <div className="text-center border-x border-border">
              <p className="text-ink-2 mb-0.5">Exento IVA</p>
              <p className="font-bold text-ink font-mono">{fmt(totalExento)}</p>
            </div>
            <div className="text-center">
              <p className="text-ink-2 mb-0.5">Total Luz</p>
              <p className="font-bold text-amber-600 font-mono">{fmt(totalAfecto + totalExento)}</p>
            </div>
          </div>

          {result.noEncontrados.length > 0 && (
            <div className="bg-warn-soft/50 border border-warn/30 rounded-component p-3 text-xs text-warn space-y-0.5">
              <p className="font-semibold mb-1">En CSV pero sin local en el sistema:</p>
              {result.noEncontrados.map((e, i) => <p key={i}>• {e}</p>)}
            </div>
          )}

          {result.sinDatosEnCsv?.length > 0 && (
            <div className="bg-paper-2 border border-border rounded-component p-3 text-xs space-y-1.5">
              <p className="font-semibold text-ink">Locales activos sin datos en este CSV ({result.sinDatosEnCsv.length}):</p>
              <div className="flex flex-wrap gap-1.5">
                {result.sinDatosEnCsv.map((c, i) => (
                  <span key={i} className="font-mono bg-white border border-border px-1.5 py-0.5 rounded text-ink-2">{c}</span>
                ))}
              </div>
            </div>
          )}

          <div className="max-h-64 overflow-y-auto rounded-component border border-border">
            <table className="w-full text-xs">
              <thead className="bg-paper-2 sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2 text-ink-2">Local</th>
                  <th className="text-right px-3 py-2 text-ink-2">Afecto</th>
                  <th className="text-right px-3 py-2 text-ink-2">Exento</th>
                  <th className="text-right px-3 py-2 text-ink-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {result.resultados.map((r, i) => (
                  <tr key={i} className="border-t border-border/60">
                    <td className="px-3 py-1.5 font-mono font-medium text-accent">{r.codigo}</td>
                    <td className="px-3 py-1.5 text-right font-mono">{fmt(r.costoAfecto)}</td>
                    <td className="px-3 py-1.5 text-right font-mono">{fmt(r.costoExento)}</td>
                    <td className="px-3 py-1.5 text-right font-mono font-medium">{fmt(r.costoAfecto + r.costoExento)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-ok font-medium">✓ Costos de luz aplicados al ciclo {result.mes}</p>
        </div>
      )}
    </div>
  );
}

function DropZoneCostosAgua({ mes }: { mes: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportCostosResult | null>(null);

  const mutation = useMutation<ImportCostosResult, Error, File>({
    mutationFn: async (f) => {
      const fd = new FormData();
      fd.append("archivo", f);
      const { data } = await api.post<ImportCostosResult>(
        `/admin/lecturas/agua/import-costos?mes=${mes}`,
        fd,
      );
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

  const fmt = (n: number) =>
    new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n);

  const totalAgua = result?.resultados.reduce((s, r) => s + r.costo, 0) ?? 0;

  return (
    <div className="bg-white border border-border rounded-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <FileSpreadsheet size={20} className="text-blue-500" />
        <h3 className="font-semibold text-ink">Costos de Agua Mensual — Excel Facturación SALR</h3>
        <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">Columna Agua ($)</span>
      </div>

      <p className="text-xs text-ink-2">
        Carga el Excel mensual de Facturación SALR. Se leen las columnas{" "}
        <code className="font-mono bg-paper-2 px-1 rounded">Local</code> y{" "}
        <code className="font-mono bg-paper-2 px-1 rounded">Agua ($)</code>{" "}
        (también acepta &quot;Agua Marzo ($)&quot;, &quot;Agua Abril ($)&quot;, etc.).
        Para locales combinados (ej: L105ACD, L111-114) distribuye el monto en partes iguales.
      </p>

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-card p-6 text-center cursor-pointer transition-colors ${
          isDragActive ? "border-blue-400 bg-blue-50/30" : "border-border hover:border-blue-300 bg-paper"
        }`}
      >
        <input {...getInputProps()} />
        <Upload size={28} className="mx-auto mb-2 text-ink-2" />
        {file ? (
          <div>
            <p className="text-sm font-medium text-ink">{file.name}</p>
            <p className="text-xs text-ink-2">{(file.size / 1024).toFixed(1)} KB</p>
          </div>
        ) : (
          <div>
            <p className="text-sm text-ink">Arrastra el Excel aquí o haz clic</p>
            <p className="text-xs text-ink-2 mt-1">.xlsx · .xls · máx 10MB</p>
          </div>
        )}
      </div>

      {file && !result && (
        <div className="flex gap-2">
          <button
            onClick={() => mutation.mutate(file)}
            disabled={mutation.isPending}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium py-2 rounded-component transition-colors"
          >
            {mutation.isPending ? "Importando…" : "Importar costos de agua"}
          </button>
          <button
            onClick={() => { setFile(null); setResult(null); }}
            className="p-2 border border-border rounded-component hover:bg-paper-2 transition-colors"
          >
            <X size={16} className="text-ink-2" />
          </button>
        </div>
      )}

      {mutation.isError && (
        <div className="bg-warn-soft border border-warn/30 rounded-component px-3 py-2 text-sm text-warn">
          Error: {mutation.error.message}
        </div>
      )}

      {result && (
        <div className="space-y-3">
          <div className="flex items-center gap-4 text-sm flex-wrap">
            <span className="flex items-center gap-1 text-ok">
              <CheckCircle size={14} /> {result.importados} locales importados
            </span>
            {result.noEncontrados.length > 0 && (
              <span className="flex items-center gap-1 text-warn">
                <AlertTriangle size={14} /> {result.noEncontrados.length} no encontrados
              </span>
            )}
            <span className="font-mono text-sm font-semibold text-blue-600 ml-auto">
              Total: {fmt(totalAgua)}
            </span>
          </div>

          {result.noEncontrados.length > 0 && (
            <div className="bg-warn-soft/50 border border-warn/30 rounded-component p-3 text-xs text-warn space-y-0.5">
              {result.noEncontrados.map((e, i) => <p key={i}>• {e}</p>)}
            </div>
          )}

          <div className="max-h-64 overflow-y-auto rounded-component border border-border">
            <table className="w-full text-xs">
              <thead className="bg-paper-2 sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2 text-ink-2">Local</th>
                  <th className="text-left px-3 py-2 text-ink-2">Marca</th>
                  <th className="text-right px-3 py-2 text-ink-2">Agua ($)</th>
                </tr>
              </thead>
              <tbody>
                {result.resultados.map((r, i) => (
                  <tr key={i} className="border-t border-border/60">
                    <td className="px-3 py-1.5 font-mono font-medium text-accent">{r.codigo}</td>
                    <td className="px-3 py-1.5 text-ink-2">{r.marca || "—"}</td>
                    <td className="px-3 py-1.5 text-right font-mono font-medium">{fmt(r.costo)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {result.importados > 0 && (
            <p className="text-xs text-ok font-medium">✓ Costos de agua aplicados al ciclo {result.mes}</p>
          )}

          {result.importados === 0 && result.diagnostico && (
            <div className="bg-red-50 border border-red-200 rounded-component p-3 text-xs space-y-1.5">
              <p className="font-semibold text-red-700">No se importaron datos — diagnóstico del archivo:</p>
              <p className="text-red-600">Fila de cabecera detectada: <span className="font-mono">{result.diagnostico.headerRowIdx}</span> · Filas leídas: <span className="font-mono">{result.diagnostico.totalFilas}</span></p>
              <p className="text-red-600">Columna agua detectada: <span className="font-mono">{result.diagnostico.aguaKey ?? "ninguna"}</span></p>
              {result.diagnostico.columnas.length > 0 && (
                <div>
                  <p className="text-red-600 font-medium mb-1">Columnas encontradas en el Excel:</p>
                  <div className="flex flex-wrap gap-1">
                    {result.diagnostico.columnas.map((c, i) => (
                      <span key={i} className="font-mono bg-white border border-red-200 px-1.5 py-0.5 rounded text-red-700">{c}</span>
                    ))}
                  </div>
                </div>
              )}
              {result.diagnostico.totalFilas === 0 && (
                <p className="text-red-700 font-semibold">⚠ No se encontró la fila de cabecera (con "Local"). Verifica que el Excel tenga el formato correcto.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ImportarExcel() {
  const { mes, setMes } = useMes();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink">Importar costos</h1>
          <p className="text-sm text-ink-2">Carga los costos de luz y agua del mes</p>
        </div>
        <input
          type="month"
          value={mes}
          onChange={(e) => setMes(e.target.value)}
          className="border border-border rounded-component px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
      </div>

      <DropZoneScada mes={mes} />
      <DropZoneCostosAgua mes={mes} />
    </div>
  );
}
