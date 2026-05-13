import { Router, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { autenticar, autorizar } from "../middleware/auth.js";

const router = Router();
router.use(autenticar);
router.use(autorizar("admin", "board"));

// GET /api/board/kpis/:mes
router.get("/kpis/:mes", async (req, res: Response): Promise<void> => {
  const { mes } = req.params;

  const [facturado, cobrado, mora, totalLocales, localesActivos] = await Promise.all([
    prisma.factura.aggregate({ where: { mes, estado: { not: "anulada" } }, _sum: { total: true } }),
    prisma.factura.aggregate({ where: { mes, estado: "pagada" }, _sum: { total: true } }),
    prisma.factura.aggregate({ where: { mes, estado: { in: ["mora", "vencida"] } }, _sum: { total: true } }),
    prisma.local.count(),
    prisma.local.count({ where: { estado: "activo" } }),
  ]);

  const f = facturado._sum.total ?? 0;
  const c = cobrado._sum.total ?? 0;

  res.json({
    facturado: f,
    cobrado: c,
    mora: mora._sum.total ?? 0,
    porcentajeCobrado: f > 0 ? Math.round((c / f) * 100) : 0,
    ocupacion: totalLocales > 0 ? Math.round((localesActivos / totalLocales) * 100) : 0,
    totalLocales,
    localesActivos,
  });
});

// GET /api/board/serie/:meses — últimos N meses para gráfico
router.get("/serie/:meses", async (req, res: Response): Promise<void> => {
  const n = Math.min(24, parseInt(req.params.meses) || 12);
  const hoy = new Date().toISOString().slice(0, 7);

  const meses = Array.from({ length: n }, (_, i) => {
    const d = new Date(`${hoy}-01`);
    d.setMonth(d.getMonth() - (n - 1 - i));
    return d.toISOString().slice(0, 7);
  });

  const serie = await Promise.all(
    meses.map(async (m) => {
      const [f, c] = await Promise.all([
        prisma.factura.aggregate({ where: { mes: m, estado: { not: "anulada" } }, _sum: { total: true } }),
        prisma.factura.aggregate({ where: { mes: m, estado: "pagada" }, _sum: { total: true } }),
      ]);
      return { mes: m, facturado: f._sum.total ?? 0, cobrado: c._sum.total ?? 0 };
    }),
  );

  res.json(serie);
});

// GET /api/board/ocupacion — mapa de locales
router.get("/ocupacion", async (_req, res: Response): Promise<void> => {
  const locales = await prisma.local.findMany({
    orderBy: { codigo: "asc" },
    include: {
      contratos: { where: { activo: true }, include: { arrendatario: true }, take: 1 },
    },
  });

  const mes = new Date().toISOString().slice(0, 7);
  const facturasMes = await prisma.factura.findMany({ where: { mes, estado: { not: "anulada" } } });
  const mapaFacturas = Object.fromEntries(facturasMes.map((f) => [f.localId, f]));

  res.json(
    locales.map((l) => ({
      id: l.id,
      codigo: l.codigo,
      m2: l.m2,
      categoria: l.categoria,
      estado: l.estado,
      arrendatario: l.contratos[0]?.arrendatario?.razonSocial ?? null,
      facturaMes: mapaFacturas[l.id] ?? null,
    })),
  );
});

// GET /api/board/ranking/:mes
router.get("/ranking/:mes", async (req, res: Response): Promise<void> => {
  const { mes } = req.params;
  const top = await prisma.factura.findMany({
    where: { mes, estado: { not: "anulada" } },
    orderBy: { total: "desc" },
    take: 10,
    include: { local: { include: { contratos: { where: { activo: true }, include: { arrendatario: true }, take: 1 } } } },
  });
  res.json(top.map((f) => ({ localCodigo: f.local.codigo, arrendatario: f.local.contratos[0]?.arrendatario?.razonSocial ?? "-", total: f.total })));
});

export default router;
