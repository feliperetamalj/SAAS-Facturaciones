import { Router, Response } from "express";
import multer from "multer";
import { prisma } from "../../lib/prisma.js";
import { parsearExcelLuz, parsearExcelAgua, parsearExcelFacturacionAgua, parsearCsvScada } from "../../services/excel.js";
import { AuthRequest } from "../../types/index.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Calcula promedios históricos de los últimos 6 meses
async function obtenerPromediosLuz(mes: string): Promise<Record<string, number>> {
  const lecturas = await prisma.lecturaLuz.findMany({
    where: { mes: { lt: mes } },
    orderBy: { mes: "desc" },
    include: { local: { select: { codigo: true } } },
    take: 6 * 50,
  });
  const mapa: Record<string, number[]> = {};
  for (const l of lecturas) {
    const c = l.local.codigo;
    if (!mapa[c]) mapa[c] = [];
    mapa[c].push(l.kwh);
  }
  return Object.fromEntries(Object.entries(mapa).map(([k, v]) => [k, v.reduce((a, b) => a + b, 0) / v.length]));
}

async function obtenerPromediosAgua(mes: string): Promise<Record<string, number>> {
  const lecturas = await prisma.lecturaAgua.findMany({
    where: { mes: { lt: mes } },
    orderBy: { mes: "desc" },
    include: { local: { select: { codigo: true } } },
    take: 6 * 50,
  });
  const mapa: Record<string, number[]> = {};
  for (const l of lecturas) {
    const c = l.local.codigo;
    if (!mapa[c]) mapa[c] = [];
    if (l.m3 != null) mapa[c].push(l.m3);
  }
  return Object.fromEntries(Object.entries(mapa).map(([k, v]) => [k, v.reduce((a, b) => a + b, 0) / v.length]));
}

// POST /api/admin/lecturas/luz/import?mes=2026-05
router.post("/luz/import", upload.single("archivo"), async (req: AuthRequest, res: Response): Promise<void> => {
  const mes = (req.query.mes as string) ?? new Date().toISOString().slice(0, 7);

  if (!req.file) {
    res.status(400).json({ error: "Archivo requerido" });
    return;
  }

  const promedios = await obtenerPromediosLuz(mes);
  const filas = parsearExcelLuz(req.file.buffer, promedios);

  const locales = await prisma.local.findMany({ select: { id: true, codigo: true } });
  const mapaLocales = Object.fromEntries(locales.map((l) => [l.codigo, l.id]));

  const resultados = [];
  const errores = [];

  for (const fila of filas) {
    const localId = mapaLocales[fila.codigoLocal];
    if (!localId) {
      errores.push(`Local no encontrado: ${fila.codigoLocal}`);
      continue;
    }
    const lectura = await prisma.lecturaLuz.upsert({
      where: { localId_mes: { localId, mes } },
      create: { localId, mes, lecturaAnterior: fila.lecturaAnterior, lecturaActual: fila.lecturaActual, kwh: fila.kwh, fuente: "excel", anomalia: fila.anomalia },
      update: { lecturaAnterior: fila.lecturaAnterior, lecturaActual: fila.lecturaActual, kwh: fila.kwh, anomalia: fila.anomalia },
    });
    resultados.push({ ...lectura, codigo: fila.codigoLocal });
  }

  res.json({ importados: resultados.length, anomalias: resultados.filter((r) => r.anomalia).length, errores, lecturas: resultados });
});

// POST /api/admin/lecturas/luz/import-scada?mes=2026-05
router.post("/luz/import-scada", upload.single("archivo"), async (req: AuthRequest, res: Response): Promise<void> => {
  const mes = (req.query.mes as string) ?? new Date().toISOString().slice(0, 7);

  if (!req.file) {
    res.status(400).json({ error: "Archivo requerido" });
    return;
  }

  const { filas, diagnostico } = parsearCsvScada(req.file.buffer);
  const locales = await prisma.local.findMany({ select: { id: true, codigo: true, estado: true } });
  const mapaLocales = Object.fromEntries(locales.map((l) => [l.codigo, l.id]));
  const todosLosCodigos = locales.map((l) => l.codigo);

  const resultados: { codigo: string; costoAfecto: number; costoExento: number }[] = [];
  const noEncontrados: string[] = [];
  const codigosImportados = new Set<string>();

  for (const fila of filas) {
    // Resolver cada código contra la BD, con expansión de prefijo para casos como "L120" → L120A, L120B...
    const codigosResueltos: string[] = [];
    for (const codigo of fila.codigosLocales) {
      if (mapaLocales[codigo]) {
        codigosResueltos.push(codigo);
      } else {
        // Expansión de prefijo: "L120" → todos los locales que empiezan con "L120" + al menos un carácter más
        const hijos = todosLosCodigos.filter((c) => c.startsWith(codigo) && c.length > codigo.length).sort();
        if (hijos.length > 0) {
          codigosResueltos.push(...hijos);
        } else {
          noEncontrados.push(`${codigo}${fila.codigosLocales.length > 1 ? ` (de "${fila.codigoOriginal}")` : ""}`);
        }
      }
    }

    if (codigosResueltos.length === 0) continue;

    // Dividir el costo total entre todos los locales resueltos
    const n = codigosResueltos.length;
    const costoAfecto = fila.costoAfectoTotal / n;
    const costoExento = fila.costoExentoTotal / n;

    for (const codigo of codigosResueltos) {
      const localId = mapaLocales[codigo];
      if (!localId) continue;
      await prisma.lecturaLuz.upsert({
        where: { localId_mes: { localId, mes } },
        create: { localId, mes, costoAfecto, costoExento, fuente: "scada" },
        update: { costoAfecto, costoExento, fuente: "scada" },
      });
      resultados.push({ codigo, costoAfecto, costoExento });
      codigosImportados.add(codigo);
    }
  }

  // Locales activos en la BD que no aparecieron en el CSV
  const sinDatosEnCsv = locales
    .filter((l) => l.estado === "activo" && !codigosImportados.has(l.codigo))
    .map((l) => l.codigo)
    .sort();

  res.json({ mes, importados: resultados.length, noEncontrados, sinDatosEnCsv, resultados, diagnostico });
});

// POST /api/admin/lecturas/agua/import?mes=2026-05
router.post("/agua/import", upload.single("archivo"), async (req: AuthRequest, res: Response): Promise<void> => {
  const mes = (req.query.mes as string) ?? new Date().toISOString().slice(0, 7);

  if (!req.file) {
    res.status(400).json({ error: "Archivo requerido" });
    return;
  }

  const promedios = await obtenerPromediosAgua(mes);
  const filas = parsearExcelAgua(req.file.buffer, promedios);

  const locales = await prisma.local.findMany({ select: { id: true, codigo: true } });
  const mapaLocales = Object.fromEntries(locales.map((l) => [l.codigo, l.id]));

  const resultados = [];
  const errores = [];

  for (const fila of filas) {
    const localId = mapaLocales[fila.codigoLocal];
    if (!localId) {
      errores.push(`Local no encontrado: ${fila.codigoLocal}`);
      continue;
    }
    const lectura = await prisma.lecturaAgua.upsert({
      where: { localId_mes: { localId, mes } },
      create: { localId, mes, lecturaAnterior: fila.lecturaAnterior, lecturaActual: fila.lecturaActual, m3: fila.m3, fuente: "manual", anomalia: fila.anomalia },
      update: { lecturaAnterior: fila.lecturaAnterior, lecturaActual: fila.lecturaActual, m3: fila.m3, anomalia: fila.anomalia },
    });
    resultados.push({ ...lectura, codigo: fila.codigoLocal });
  }

  res.json({ importados: resultados.length, anomalias: resultados.filter((r) => r.anomalia).length, errores, lecturas: resultados });
});

// POST /api/admin/lecturas/agua/import-costos?mes=2026-04
// Importa costos de agua directamente desde el Excel de Facturación SALR (columna Agua_$)
router.post("/agua/import-costos", upload.single("archivo"), async (req: AuthRequest, res: Response): Promise<void> => {
  const mes = (req.query.mes as string) ?? new Date().toISOString().slice(0, 7);

  if (!req.file) {
    res.status(400).json({ error: "Archivo requerido" });
    return;
  }

  const { filas, diagnostico } = parsearExcelFacturacionAgua(req.file.buffer);
  const locales = await prisma.local.findMany({ select: { id: true, codigo: true } });
  const mapaLocales = Object.fromEntries(locales.map((l) => [l.codigo, l.id]));

  const resultados: { codigo: string; marca: string; costo: number }[] = [];
  const noEncontrados: string[] = [];

  for (const fila of filas) {
    for (const codigo of fila.codigosLocales) {
      const localId = mapaLocales[codigo];
      if (!localId) {
        noEncontrados.push(`${codigo}${fila.codigosLocales.length > 1 ? ` (de "${fila.codigoOriginal}")` : ""}`);
        continue;
      }
      await prisma.lecturaAgua.upsert({
        where: { localId_mes: { localId, mes } },
        create: { localId, mes, costoTotal: fila.costoPorLocal, fuente: "facturacion", anomalia: false },
        update: { costoTotal: fila.costoPorLocal, fuente: "facturacion" },
      });
      resultados.push({ codigo, marca: fila.marca, costo: fila.costoPorLocal });
    }
  }

  res.json({ mes, importados: resultados.length, noEncontrados, resultados, diagnostico });
});

// PUT /api/admin/lecturas/luz — edición manual de costos SCADA/luz
router.put("/luz", async (req: AuthRequest, res: Response): Promise<void> => {
  const { localId, mes, costoAfecto, costoExento } = req.body;
  if (!localId || !mes) { res.status(400).json({ error: "localId y mes son requeridos" }); return; }
  const l = await prisma.lecturaLuz.upsert({
    where: { localId_mes: { localId, mes } },
    create: { localId, mes, costoAfecto: Number(costoAfecto ?? 0), costoExento: Number(costoExento ?? 0), fuente: "manual" },
    update: { costoAfecto: Number(costoAfecto ?? 0), costoExento: Number(costoExento ?? 0), fuente: "manual" },
  });
  res.json(l);
});

// PUT /api/admin/lecturas/agua — edición manual de costo agua
router.put("/agua", async (req: AuthRequest, res: Response): Promise<void> => {
  const { localId, mes, costoTotal } = req.body;
  if (!localId || !mes) { res.status(400).json({ error: "localId y mes son requeridos" }); return; }
  const l = await prisma.lecturaAgua.upsert({
    where: { localId_mes: { localId, mes } },
    create: { localId, mes, costoTotal: Number(costoTotal ?? 0), fuente: "manual" },
    update: { costoTotal: Number(costoTotal ?? 0), fuente: "manual" },
  });
  res.json(l);
});

// GET /api/admin/lecturas?mes=2026-05
router.get("/", async (req, res: Response): Promise<void> => {
  const mes = (req.query.mes as string) ?? new Date().toISOString().slice(0, 7);
  const [luz, agua] = await Promise.all([
    prisma.lecturaLuz.findMany({ where: { mes }, include: { local: { select: { codigo: true } } } }),
    prisma.lecturaAgua.findMany({ where: { mes }, include: { local: { select: { codigo: true } } } }),
  ]);
  res.json({ mes, luz, agua });
});

export default router;
