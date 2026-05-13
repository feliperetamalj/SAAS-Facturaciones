import * as XLSX from "xlsx";
import { detectarAnomaliaConsumo } from "./calculadora.js";

export interface LecturaLuzRow {
  codigoLocal: string;
  lecturaAnterior: number;
  lecturaActual: number;
  kwh: number;
  anomalia: boolean;
}

export interface LecturaAguaRow {
  codigoLocal: string;
  lecturaAnterior: number;
  lecturaActual: number;
  m3: number;
  anomalia: boolean;
}

export function parsearExcelLuz(
  buffer: Buffer,
  promedioHistorico: Record<string, number> = {},
): LecturaLuzRow[] {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);

  return rows.map((row) => {
    const codigoLocal = String(row["Local"] ?? row["Codigo"] ?? row["CODIGO"] ?? "").trim();
    const lecturaAnterior = Number(row["Anterior"] ?? row["Lectura Anterior"] ?? 0);
    const lecturaActual = Number(row["Actual"] ?? row["Lectura Actual"] ?? 0);
    const kwh = lecturaActual - lecturaAnterior;
    const historico = promedioHistorico[codigoLocal] ?? 0;
    const anomalia = detectarAnomaliaConsumo(kwh, historico);
    return { codigoLocal, lecturaAnterior, lecturaActual, kwh, anomalia };
  });
}

export function parsearExcelAgua(
  buffer: Buffer,
  promedioHistorico: Record<string, number> = {},
): LecturaAguaRow[] {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);

  return rows.map((row) => {
    const codigoLocal = String(row["Local"] ?? row["Codigo"] ?? row["CODIGO"] ?? "").trim();
    const lecturaAnterior = Number(row["Anterior"] ?? row["Lectura Anterior"] ?? 0);
    const lecturaActual = Number(row["Actual"] ?? row["Lectura Actual"] ?? 0);
    const m3 = lecturaActual - lecturaAnterior;
    const historico = promedioHistorico[codigoLocal] ?? 0;
    const anomalia = detectarAnomaliaConsumo(m3, historico);
    return { codigoLocal, lecturaAnterior, lecturaActual, m3, anomalia };
  });
}

// ---------------------------------------------------------------------------
// Importación de costos de agua desde Excel de Facturación SALR
// Columnas requeridas: "Local" y "Agua_($)"
// ---------------------------------------------------------------------------

export interface AguaFacturacionRow {
  codigoOriginal: string;
  codigosLocales: string[];
  marca: string;
  costoTotal: number;
  costoPorLocal: number;
}

export interface AguaFacturacionDiagnostico {
  headerRowIdx: number;
  columnas: string[];
  totalFilas: number;
  aguaKey: string | null;
}

function normalizarCodigos(raw: string): string[] {
  const s = raw.trim().toUpperCase().replace(/\s/g, "");

  // Mercadito: "120-A", "121-A" → "L120A", "L121A"
  const mercMatch = s.match(/^(\d+)-([A-Z])$/);
  if (mercMatch) return [`L${mercMatch[1]}${mercMatch[2]}`];

  // Rango numérico: "L111-114", "L207-208" → ["L111","L112",...,"L114"]
  const rangeMatch = s.match(/^L(\d{3})-(\d{3})$/);
  if (rangeMatch) {
    const start = parseInt(rangeMatch[1]);
    const end = parseInt(rangeMatch[2]);
    return Array.from({ length: end - start + 1 }, (_, i) => `L${start + i}`);
  }

  // Letras compactas: "L105ACD" → ["L105A", "L105C", "L105D"]
  const compactLetras = s.match(/^(L\d+)([A-Z]{2,})$/);
  if (compactLetras) {
    return compactLetras[2].split("").map((l) => `${compactLetras[1]}${l}`);
  }

  // Ya tiene formato correcto: "L101", "L102A"
  if (s.startsWith("L")) return [s];

  return [s];
}

// Normaliza una clave de columna: colapsa saltos de línea/tabs/espacios extras
function normColKey(k: string): string {
  return k.replace(/[\n\r\t]+/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
}

// Convierte un valor de celda Excel a número CLP (maneja separador de miles "." del locale chileno)
function parsearCLP(v: unknown): number {
  if (v === undefined || v === null || v === "") return 0;
  if (typeof v === "number") return v;
  // String como "138.511" (Chile) → remover puntos de miles → parsear
  const s = String(v).trim().replace(/\./g, "").replace(",", ".");
  return parseFloat(s) || 0;
}

export function parsearExcelFacturacionAgua(buffer: Buffer): { filas: AguaFacturacionRow[]; diagnostico: AguaFacturacionDiagnostico } {
  const wb = XLSX.read(buffer, { type: "buffer" });

  // Buscar la hoja que contenga "Local" en las primeras filas (soporta múltiples hojas)
  let ws = wb.Sheets[wb.SheetNames[0]];
  for (const name of wb.SheetNames) {
    const candidate = wb.Sheets[name];
    const test = XLSX.utils.sheet_to_json<unknown[]>(candidate, { header: 1, defval: "" });
    if (test.slice(0, 15).some((row) => (row as unknown[]).some((c) => normColKey(String(c)) === "local"))) {
      ws = candidate;
      break;
    }
  }

  // Auto-detectar fila de cabecera buscando la celda "local"
  const rawRows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "" });
  let headerRowIdx = 0;
  for (let i = 0; i < Math.min(rawRows.length, 15); i++) {
    const row = rawRows[i] as unknown[];
    if (row.some((c) => normColKey(String(c)) === "local")) {
      headerRowIdx = i;
      break;
    }
  }

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "", range: headerRowIdx });
  const columnas = rows.length > 0 ? Object.keys(rows[0]) : [];

  // Identificar la clave de la columna agua:
  // 1. Prioridad: contiene "agua" Y "$"   (ej: "Agua($)", "Agua Marzo ($)")
  // 2. Fallback:  contiene solo "agua"    (ej: "Agua")
  let aguaKey: string | null = null;
  for (const key of columnas) {
    const kn = normColKey(key);
    if (kn.includes("agua") && kn.includes("$")) { aguaKey = key; break; }
  }
  if (!aguaKey) {
    for (const key of columnas) {
      if (normColKey(key).includes("agua")) { aguaKey = key; break; }
    }
  }

  const diagnostico: AguaFacturacionDiagnostico = { headerRowIdx, columnas, totalFilas: rows.length, aguaKey };
  const result: AguaFacturacionRow[] = [];

  for (const row of rows) {
    // Buscar columna Local
    let codigoRaw = "";
    for (const key of Object.keys(row)) {
      if (normColKey(key) === "local") {
        const v = row[key];
        if (v !== undefined && v !== "") { codigoRaw = String(v).trim(); break; }
      }
    }
    if (!codigoRaw) continue;

    // Leer costo agua
    const costoTotal = aguaKey ? parsearCLP(row[aguaKey]) : 0;
    if (costoTotal <= 0) continue;

    // Buscar marca
    let marca = "";
    for (const key of Object.keys(row)) {
      if (normColKey(key) === "marca") { marca = String(row[key] ?? "").trim(); break; }
    }

    const codigosLocales = normalizarCodigos(codigoRaw);
    const costoPorLocal = costoTotal / codigosLocales.length;
    result.push({ codigoOriginal: codigoRaw, codigosLocales, marca, costoTotal, costoPorLocal });
  }

  return { filas: result, diagnostico };
}

// ---------------------------------------------------------------------------
// Importación masiva de locales y arrendatarios desde Excel tipo ALR
// Columnas: Local, Piso, Arrendatario, Nombre, RUT, Giro, m^2 Arrendados,
//   m^2 Terraza, Uf/m^2 Arriendo, Uf/m^2 Terraza, Uf/m^2 (Gastos Comunes),
//   Uf/m^2 (Gastos Comunes) Terraza, Fondo Promo Uf,
//   Precio Fijo Arriendo (UF), Precio Fijo GGCC (UF)
// ---------------------------------------------------------------------------

export interface FilaLocales {
  codigo: string;
  piso: string;
  razonSocial: string | null;
  nombreComercial: string | null;
  rut: string | null;
  giro: string | null;
  m2: number;
  m2Terraza: number | null;
  ufM2Arriendo: number;
  ufM2Terraza: number | null;
  ufM2Gc: number;
  ufM2GcTerraza: number | null;
  fondoPromo: number | null;
  precioFijoArriendo: number | null;
  precioFijoGc: number | null;
  esDisponible: boolean;
  esPrecioFijo: boolean;
}

function normKey(s: string): string {
  return s
    .toLowerCase()
    .replace(/²/g, "2")   // ² → 2
    .replace(/\^2/g, "2")      // ^2 → 2
    .replace(/\s+/g, " ")
    .trim();
}

// Construye un mapa normalizado de las claves de la fila para búsqueda flexible
function makeNormMap(row: Record<string, unknown>): Map<string, unknown> {
  const m = new Map<string, unknown>();
  for (const [k, v] of Object.entries(row)) {
    m.set(normKey(k), v);
  }
  return m;
}

function colVal(normMap: Map<string, unknown>, ...keys: string[]): unknown {
  for (const k of keys) {
    const v = normMap.get(normKey(k));
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return undefined;
}

function numOrNull(v: unknown): number | null {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

function esFijo(v: unknown): boolean {
  const s = String(v ?? "").toLowerCase().trim();
  return s === "fija" || s === "fijo" || s.startsWith("precio fijo");
}

function normalizarCodigoLocal(raw: string): string {
  const s = raw.trim().toUpperCase().replace(/\s/g, "");
  // Mercadito: "120-A" → "L120A"
  const mercMatch = s.match(/^(\d{2,3})-([A-Z])$/);
  if (mercMatch) return `L${mercMatch[1]}${mercMatch[2]}`;
  // Si ya empieza con L, usar tal cual
  if (s.startsWith("L")) return s;
  return s;
}

export interface ResultadoParseLocales {
  filas: FilaLocales[];
  columnasDetectadas: string[];  // para diagnóstico
  filaHeaderIdx: number;
}

export function parsearExcelLocales(buffer: Buffer): ResultadoParseLocales {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const ws = wb.Sheets[wb.SheetNames[0]];

  // Detecta la fila de cabecera buscando la celda "Local"
  const rawRows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "" });
  let headerRowIdx = 0;
  for (let i = 0; i < Math.min(rawRows.length, 6); i++) {
    const row = rawRows[i] as unknown[];
    if (row.some((c) => String(c).trim().toLowerCase() === "local")) {
      headerRowIdx = i;
      break;
    }
  }

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "", range: headerRowIdx });
  const columnasDetectadas = rows.length > 0 ? Object.keys(rows[0]) : [];

  const filas: FilaLocales[] = [];

  for (const row of rows) {
    const nm = makeNormMap(row);

    const codigoRaw = String(colVal(nm, "Local") ?? "").trim();
    if (!codigoRaw) continue;

    const m2Val = numOrNull(colVal(nm, "m2 arrendados", "m^2 arrendados", "m2"));
    if (m2Val === null || m2Val <= 0) continue;

    const codigo = normalizarCodigoLocal(codigoRaw);
    const piso = String(colVal(nm, "Piso") ?? "").trim();

    const arrendatarioRaw = String(colVal(nm, "Arrendatario") ?? "").trim();
    const nombreRaw       = String(colVal(nm, "Nombre") ?? "").trim();
    const rutRaw          = String(colVal(nm, "RUT", "Rut", "rut") ?? "").trim();
    const giroRaw         = String(colVal(nm, "Giro") ?? "").trim();

    const esDisponible =
      arrendatarioRaw === "" ||
      arrendatarioRaw === "—" ||
      arrendatarioRaw.toUpperCase().includes("DISPONIBLE") ||
      !rutRaw;

    const ufArriendoRaw  = colVal(nm, "Uf/m2 Arriendo", "UF/m2 Arriendo");
    const ufTerrazaRaw   = colVal(nm, "Uf/m2 Terraza",  "UF/m2 Terraza");
    const ufGcRaw        = colVal(nm, "Uf/m2 (Gastos Comunes)", "UF/m2 (Gastos Comunes)");
    const ufGcTerrazaRaw = colVal(nm, "Uf/m2 (Gastos Comunes) Terraza");
    const fondoPromoRaw  = colVal(nm, "Fondo Promo Uf", "Fondo Promo UF", "Fondo Promo");
    const pfArriendoRaw  = colVal(nm, "Precio Fijo Arriendo (UF)", "Precio Fijo Arriendo");
    const pfGcRaw        = colVal(nm, "Precio Fijo GGCC (UF)", "Precio Fijo GC (UF)");

    const esPrecioFijo = esFijo(ufArriendoRaw) || esFijo(ufGcRaw);

    filas.push({
      codigo,
      piso,
      razonSocial:        arrendatarioRaw || null,
      nombreComercial:    nombreRaw || null,
      rut:                rutRaw || null,
      giro:               giroRaw || null,
      m2:                 m2Val,
      m2Terraza:          numOrNull(colVal(nm, "m2 terraza", "m^2 terraza")),
      ufM2Arriendo:       esPrecioFijo ? 0 : (numOrNull(ufArriendoRaw) ?? 0),
      ufM2Terraza:        numOrNull(ufTerrazaRaw),
      ufM2Gc:             esPrecioFijo ? 0 : (numOrNull(ufGcRaw) ?? 0),
      ufM2GcTerraza:      numOrNull(ufGcTerrazaRaw),
      fondoPromo:         numOrNull(fondoPromoRaw),
      precioFijoArriendo: numOrNull(pfArriendoRaw),
      precioFijoGc:       numOrNull(pfGcRaw),
      esDisponible,
      esPrecioFijo,
    });
  }

  return { filas, columnasDetectadas, filaHeaderIdx: headerRowIdx };
}

// ---------------------------------------------------------------------------
// Importación de costos de luz desde CSV SCADA (informe mensual eléctrico)
// Columnas requeridas: "NUMERO LOCAL", "FACT. NETO AFECTO IVA", "FAC. NETO EXTENTO IVA"
// Los valores ya vienen en CLP.
// ---------------------------------------------------------------------------

export interface ScadaLuzRow {
  codigosLocales: string[];  // ya resueltos; el costo total debe dividirse entre ellos
  codigoOriginal: string;
  costoAfectoTotal: number;  // total sin dividir — el route divide por codigosLocales.length o por expansión
  costoExentoTotal: number;
}

function normalizarCodigosScada(raw: string): string[] {
  const s = raw.trim().toUpperCase();

  // Saltar filas no relacionadas con locales
  if (!s.match(/^L\d/)) return [];

  // "L105 A C D" → ["L105A", "L105C", "L105D"]
  // Número seguido de letras sueltas separadas por espacios
  const multiLetra = s.match(/^(L\d+)\s+([A-Z](?:\s+[A-Z])+)\s*$/);
  if (multiLetra) {
    const base = multiLetra[1];
    return multiLetra[2].split(/\s+/).map((l) => `${base}${l}`);
  }

  // Quitar espacios restantes para los siguientes patrones
  const sc = s.replace(/\s+/g, "");

  // "L207-L208" → ["L207", "L208"]
  const rangoConL = sc.match(/^(L\d+[A-Z]*)-(L\d+[A-Z]*)$/);
  if (rangoConL) return [rangoConL[1], rangoConL[2]];

  // "L111-114" o "L111-112-113-114" → rango numérico
  const partes = sc.split("-");
  if (partes.length > 1 && partes[0].match(/^L\d+$/)) {
    const start = parseInt(partes[0].slice(1));
    const end = parseInt(partes[partes.length - 1]);
    if (!isNaN(start) && !isNaN(end) && end >= start && end - start < 20) {
      return Array.from({ length: end - start + 1 }, (_, i) => `L${start + i}`);
    }
  }

  // Caso simple: "L101", "L105ACD", "L120" (prefix sin sufijo → route expandirá)
  return [sc];
}

export interface ScadaDiagnostico {
  totalFilas: number;
  columnas: string[];
  delimiter: string;
  encoding: string;
  headerRowIdx: number;
}

export function parsearCsvScada(buffer: Buffer): { filas: ScadaLuzRow[]; diagnostico: ScadaDiagnostico } {
  // Intentar decodificar como latin1 (Windows-1252) para CSVs chilenos, luego UTF-8
  let text = buffer.toString("latin1");
  let encoding = "latin1";
  if (buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    text = buffer.slice(3).toString("utf8"); // BOM UTF-8
    encoding = "utf8-bom";
  } else if (text.includes("�")) {
    text = buffer.toString("utf8");
    encoding = "utf8";
  }

  // Detectar separador: ; o ,
  const primeraLinea = text.split(/\r?\n/)[0];
  const delimiter = primeraLinea.split(";").length > primeraLinea.split(",").length ? ";" : ",";

  // Parsear con XLSX pasando el separador correcto
  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(text, { type: "string", FS: delimiter });
  } catch {
    wb = XLSX.read(buffer, { type: "buffer" });
  }
  const ws = wb.Sheets[wb.SheetNames[0]];

  // Auto-detectar fila de cabecera buscando la celda que contenga "NUMERO LOCAL" o "LOCAL"
  const rawRows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "" });
  let headerRowIdx = 0;
  for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
    const row = rawRows[i] as unknown[];
    if (row.some((c) => String(c).toUpperCase().replace(/\s+/g, " ").trim().includes("NUMERO LOCAL"))) {
      headerRowIdx = i;
      break;
    }
  }

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "", range: headerRowIdx });
  const columnas = rows.length > 0 ? Object.keys(rows[0]) : [];
  const diagnostico: ScadaDiagnostico = { totalFilas: rows.length, columnas, delimiter, encoding, headerRowIdx };

  const result: ScadaLuzRow[] = [];

  for (const row of rows) {
    // Buscar columna NUMERO LOCAL — normalizar claves para comparar
    let codigoRaw = "";
    for (const key of Object.keys(row)) {
      const kn = key.toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
      if (kn === "NUMERO LOCAL" || kn === "N LOCAL" || kn === "N° LOCAL" || kn.startsWith("NUMERO LOC")) {
        const v = row[key];
        if (v !== undefined && v !== "") { codigoRaw = String(v).trim(); break; }
      }
    }
    if (!codigoRaw) continue;

    // Buscar columnas de costo
    let costoAfecto = 0;
    let costoExento = 0;
    for (const key of Object.keys(row)) {
      const kn = key.toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
      if (kn.includes("AFECTO")) costoAfecto = parseFloat(String(row[key]).replace(/[^0-9.,-]/g, "").replace(",", ".")) || 0;
      if (kn.includes("EXTENTO") || kn.includes("EXENTO")) costoExento = parseFloat(String(row[key]).replace(/[^0-9.,-]/g, "").replace(",", ".")) || 0;
    }

    if (costoAfecto <= 0 && costoExento <= 0) continue;

    const codigosLocales = normalizarCodigosScada(codigoRaw);
    if (codigosLocales.length === 0) continue;

    result.push({
      codigosLocales,
      codigoOriginal: codigoRaw,
      costoAfectoTotal: costoAfecto,
      costoExentoTotal: costoExento,
    });
  }

  return { filas: result, diagnostico };
}

export function generarPlantillaAgua(codigos: string[]): Buffer {
  const data = codigos.map((c) => ({
    Local: c,
    "Lectura Anterior": 0,
    "Lectura Actual": 0,
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Agua");
  return Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
}
