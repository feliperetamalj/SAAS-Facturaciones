import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma.js";

const router = Router();

function requireLocalId(req: Request, res: Response): string | null {
  const id = req.query.localId as string;
  if (!id) { res.status(400).json({ error: "localId requerido" }); return null; }
  return id;
}

router.get("/locales", async (_req: Request, res: Response): Promise<void> => {
  const locales = await prisma.local.findMany({
    where: { estado: { in: ["activo", "vacio"] } },
    include: {
      contratos: {
        where: { activo: true },
        include: { arrendatario: { select: { razonSocial: true } } },
        take: 1,
      },
    },
    orderBy: { codigo: "asc" },
  });
  res.json(locales);
});

router.get("/factura/actual", async (req: Request, res: Response): Promise<void> => {
  const localId = requireLocalId(req, res);
  if (!localId) return;

  const mes = new Date().toISOString().slice(0, 7);
  const factura = await prisma.factura.findFirst({
    where: { localId, mes },
    include: { local: true, pagos: true, eventos: { orderBy: { at: "desc" } } },
  });
  res.json(factura ?? null);
});

router.get("/facturas", async (req: Request, res: Response): Promise<void> => {
  const localId = requireLocalId(req, res);
  if (!localId) return;

  const facturas = await prisma.factura.findMany({
    where: { localId },
    orderBy: { mes: "desc" },
    take: 24,
    include: { pagos: true },
  });
  res.json(facturas);
});

router.get("/comparativo/:mes", async (req: Request, res: Response): Promise<void> => {
  const localId = requireLocalId(req, res);
  if (!localId) return;

  const ultimas = await prisma.factura.findMany({
    where: { localId, mes: { lte: req.params.mes } },
    orderBy: { mes: "desc" },
    take: 6,
  });
  res.json(ultimas);
});

export default router;
