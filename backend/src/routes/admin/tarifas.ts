import { Router, Response } from "express";
import { prisma } from "../../lib/prisma.js";
import { AuthRequest } from "../../types/index.js";
import { obtenerUfHoy } from "../../services/uf.js";

const router = Router();

// GET /api/admin/tarifas/uf/hoy
router.get("/uf/hoy", async (_req, res: Response): Promise<void> => {
  try {
    const { valor, fecha } = await obtenerUfHoy();
    res.json({ valor, fecha, fuente: "mindicador.cl" });
  } catch (err: unknown) {
    const mensaje = err instanceof Error ? err.message : "No se pudo obtener el valor UF";
    res.status(502).json({ error: mensaje });
  }
});

// GET /api/admin/tarifas?mes=2026-05
router.get("/", async (req, res: Response): Promise<void> => {
  const mes = (req.query.mes as string) ?? new Date().toISOString().slice(0, 7);
  const tarifa = await prisma.tarifa.findUnique({ where: { mes } });
  const categorias = await prisma.tarifaCategoria.findMany({
    where: {
      vigenciaDesde: { lte: new Date(`${mes}-01`) },
      OR: [{ vigenciaHasta: null }, { vigenciaHasta: { gte: new Date(`${mes}-01`) } }],
    },
  });
  res.json({ tarifa, categorias });
});

// PUT /api/admin/tarifas/:mes — crea o actualiza
router.put("/:mes", async (req: AuthRequest, res: Response): Promise<void> => {
  const { mes } = req.params;
  const { valorUf, iva, precioKwh, precioM3Agua, toleranciaPago } = req.body;

  const tarifa = await prisma.tarifa.upsert({
    where: { mes },
    create: { mes, valorUf, iva, precioKwh, precioM3Agua, toleranciaPago },
    update: { valorUf, iva, precioKwh, precioM3Agua, toleranciaPago },
  });

  await prisma.auditoria.create({
    data: {
      actor: req.user!.email,
      rol: req.user!.rol,
      accion: "upsert_tarifa",
      recurso: "tarifa",
      recursoId: mes,
      despuesJson: tarifa as object,
    },
  });

  res.json(tarifa);
});

// PUT /api/admin/tarifas/categoria/:categoria
router.put("/categoria/:categoria", async (req: AuthRequest, res: Response): Promise<void> => {
  const { categoria } = req.params;
  const { ufM2Arriendo, ufM2Gc, vigenciaDesde } = req.body;

  const tc = await prisma.tarifaCategoria.upsert({
    where: { categoria_vigenciaDesde: { categoria, vigenciaDesde: new Date(vigenciaDesde) } },
    create: { categoria, ufM2Arriendo, ufM2Gc, vigenciaDesde: new Date(vigenciaDesde) },
    update: { ufM2Arriendo, ufM2Gc },
  });

  res.json(tc);
});

export default router;
