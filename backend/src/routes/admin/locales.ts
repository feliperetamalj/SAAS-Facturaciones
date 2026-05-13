import { Router, Response } from "express";
import multer from "multer";
import { prisma } from "../../lib/prisma.js";
import { AuthRequest } from "../../types/index.js";
import { parsearExcelLocales } from "../../services/excel.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

function pisoACategoria(piso: string): string {
  const p = piso.toLowerCase();
  if (p.includes("mercadito")) return "MERCADITO";
  if (p.includes("2")) return "PISO_2";
  return "PISO_1";
}

const router = Router();

router.get("/", async (_req, res: Response): Promise<void> => {
  const locales = await prisma.local.findMany({
    include: {
      contratos: {
        where: { activo: true },
        include: { arrendatario: true },
        take: 1,
        orderBy: { vigenciaDesde: "desc" },
      },
    },
    orderBy: { codigo: "asc" },
  });
  res.json(locales);
});

router.get("/:id", async (req, res: Response): Promise<void> => {
  const local = await prisma.local.findUnique({
    where: { id: req.params.id },
    include: {
      contratos: { include: { arrendatario: true }, orderBy: { vigenciaDesde: "desc" } },
      facturas: { orderBy: { mes: "desc" }, take: 13 },
    },
  });
  if (!local) { res.status(404).json({ error: "Local no encontrado" }); return; }
  res.json(local);
});

router.post("/", async (req: AuthRequest, res: Response): Promise<void> => {
  const { codigo, nombre, m2, m2Terraza, categoria, estado, piso } = req.body;
  if (!codigo || !m2 || !categoria) {
    res.status(400).json({ error: "codigo, m2 y categoria son requeridos" });
    return;
  }
  const local = await prisma.local.create({
    data: {
      codigo,
      nombre,
      m2: Number(m2),
      m2Terraza: m2Terraza != null && m2Terraza !== "" ? Number(m2Terraza) : null,
      categoria,
      estado: estado ?? "activo",
      piso,
    },
  });
  await prisma.auditoria.create({
    data: { actor: req.user!.email, rol: req.user!.rol, accion: "create_local", recurso: "local", recursoId: local.id, despuesJson: local as object },
  });
  res.status(201).json(local);
});

router.put("/:id", async (req: AuthRequest, res: Response): Promise<void> => {
  const { codigo, nombre, m2, m2Terraza, categoria, estado, piso } = req.body;
  const antes = await prisma.local.findUnique({ where: { id: req.params.id } });
  if (!antes) { res.status(404).json({ error: "Local no encontrado" }); return; }
  const local = await prisma.local.update({
    where: { id: req.params.id },
    data: {
      codigo,
      nombre,
      m2: m2 != null ? Number(m2) : undefined,
      m2Terraza: m2Terraza != null && m2Terraza !== "" ? Number(m2Terraza) : null,
      categoria,
      estado,
      piso,
    },
  });
  await prisma.auditoria.create({
    data: { actor: req.user!.email, rol: req.user!.rol, accion: "update_local", recurso: "local", recursoId: local.id, antesJson: antes as object, despuesJson: local as object },
  });
  res.json(local);
});

router.delete("/:id", async (req: AuthRequest, res: Response): Promise<void> => {
  const contratos = await prisma.contrato.count({ where: { localId: req.params.id, activo: true } });
  if (contratos > 0) {
    res.status(409).json({ error: `No se puede eliminar: tiene ${contratos} contrato(s) activo(s).` });
    return;
  }
  const facturas = await prisma.factura.count({ where: { localId: req.params.id } });
  if (facturas > 0) {
    res.status(409).json({ error: `No se puede eliminar: tiene ${facturas} factura(s) registrada(s).` });
    return;
  }
  await prisma.local.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

// POST /api/admin/locales/import-excel
router.post("/import-excel", upload.single("archivo"), async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.file) { res.status(400).json({ error: "No se recibió ningún archivo" }); return; }

  const { filas, columnasDetectadas, filaHeaderIdx } = parsearExcelLocales(req.file.buffer);
  const resumen = {
    procesados: filas.length,
    columnasDetectadas,   // diagnóstico: qué columnas vio el parser
    filaHeaderIdx,
    creados: 0,
    actualizados: 0,
    sinContrato: 0,
    errores: [] as string[],
    detalle: [] as { codigo: string; nombre: string | null; accion: string }[],
  };

  for (const fila of filas) {
    try {
      const categoria = pisoACategoria(fila.piso);
      const estado = fila.esDisponible ? "vacio" : "activo";
      const yaExistia = await prisma.local.findUnique({ where: { codigo: fila.codigo } });

      const local = await prisma.local.upsert({
        where: { codigo: fila.codigo },
        create: { codigo: fila.codigo, nombre: fila.nombreComercial, m2: fila.m2, m2Terraza: fila.m2Terraza, categoria, estado, piso: fila.piso },
        update: { nombre: fila.nombreComercial ?? undefined, m2: fila.m2, m2Terraza: fila.m2Terraza, categoria, estado, piso: fila.piso || undefined },
      });

      if (fila.esDisponible || !fila.rut) {
        resumen.sinContrato++;
        const accion = yaExistia ? "actualizado" : "creado";
        if (!yaExistia) resumen.creados++; else resumen.actualizados++;
        resumen.detalle.push({ codigo: fila.codigo, nombre: fila.nombreComercial, accion: `${accion} (sin contrato)` });
        continue;
      }

      const arrendatario = await prisma.arrendatario.upsert({
        where: { rut: fila.rut },
        create: { rut: fila.rut, razonSocial: fila.razonSocial ?? fila.rut, nombreComercial: fila.nombreComercial, giro: fila.giro, email: null },
        update: { razonSocial: fila.razonSocial ?? undefined, nombreComercial: fila.nombreComercial ?? undefined, giro: fila.giro ?? undefined },
      });

      await prisma.contrato.updateMany({ where: { localId: local.id, activo: true }, data: { activo: false } });

      await prisma.contrato.create({
        data: {
          localId: local.id,
          arrendatarioId: arrendatario.id,
          ufM2Arriendo: fila.ufM2Arriendo,
          ufM2Gc: fila.ufM2Gc,
          ufM2Terraza: fila.ufM2Terraza,
          ufM2GcTerraza: fila.ufM2GcTerraza,
          fondoPromo: fila.fondoPromo,
          precioFijoArriendo: fila.precioFijoArriendo,
          precioFijoGc: fila.precioFijoGc,
          vigenciaDesde: new Date(),
          activo: true,
        },
      });

      const accion = yaExistia ? "actualizado" : "creado";
      if (!yaExistia) resumen.creados++; else resumen.actualizados++;
      resumen.detalle.push({ codigo: fila.codigo, nombre: fila.nombreComercial, accion });
    } catch (err: unknown) {
      resumen.errores.push(`${fila.codigo}: ${err instanceof Error ? err.message : "Error desconocido"}`);
    }
  }

  await prisma.auditoria.create({
    data: {
      actor: req.user!.email,
      rol: req.user!.rol,
      accion: "import_excel_locales",
      recurso: "local",
      despuesJson: { procesados: resumen.procesados, creados: resumen.creados, actualizados: resumen.actualizados, errores: resumen.errores.length },
    },
  });

  res.json(resumen);
});

export default router;
