import { Router } from "express";
import { autenticar, autorizar } from "../../middleware/auth.js";
import localesRouter from "./locales.js";
import tarifasRouter from "./tarifas.js";
import lecturasRouter from "./lecturas.js";
import cicloRouter from "./ciclo.js";
import conciliacionRouter from "./conciliacion.js";
import { prisma } from "../../lib/prisma.js";
import { AuthRequest } from "../../types/index.js";
import { obtenerUfHoy } from "../../services/uf.js";

const router = Router();

router.use(autenticar);
router.use(autorizar("admin"));

router.use("/locales", localesRouter);
router.use("/tarifas", tarifasRouter);
router.use("/lecturas", lecturasRouter);
router.use("/ciclo", cicloRouter);
router.use("/conciliacion", conciliacionRouter);

// Dashboard KPIs
router.get("/dashboard/:mes", async (req, res) => {
  const { mes } = req.params;

  const [facturado, cobrado, localesActivos, mora, contratos, estados] = await Promise.all([
    prisma.factura.aggregate({ where: { mes, estado: { not: "anulada" } }, _sum: { total: true } }),
    prisma.factura.aggregate({ where: { mes, estado: "pagada" }, _sum: { total: true } }),
    prisma.local.count({ where: { estado: "activo" } }),
    prisma.factura.aggregate({ where: { mes, estado: { in: ["mora", "vencida"] } }, _sum: { total: true } }),
    prisma.contrato.findMany({ where: { activo: true }, include: { local: true } }),
    prisma.factura.groupBy({ by: ["estado"], where: { mes }, _count: { estado: true } }),
  ]);

  // UF del día (fallback a tarifa del mes si falla la API)
  let valorUf = 0;
  let fuenteUf = "tarifa";
  try {
    const uf = await obtenerUfHoy();
    valorUf = uf.valor;
    fuenteUf = "mindicador.cl";
  } catch {
    const tarifa = await prisma.tarifa.findUnique({ where: { mes } });
    valorUf = tarifa?.valorUf ?? 0;
  }

  // Proyección: suma arriendo + GC de todos los contratos activos
  let proyArriendoTotal = 0;
  let proyGcTotal = 0;
  for (const c of contratos) {
    const m2 = c.local.m2;
    const m2T = c.local.m2Terraza ?? 0;

    const arriendo = c.precioFijoArriendo != null
      ? c.precioFijoArriendo * valorUf
      : (m2 * c.ufM2Arriendo + m2T * (c.ufM2Terraza ?? 0)) * valorUf;

    const gc = c.precioFijoGc != null
      ? c.precioFijoGc * valorUf
      : (m2 * c.ufM2Gc + m2T * (c.ufM2GcTerraza ?? 0)) * valorUf;

    proyArriendoTotal += arriendo;
    proyGcTotal += gc;
  }

  // Últimos 12 meses para gráfico
  const doce = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(`${mes}-01`);
    d.setMonth(d.getMonth() - (11 - i));
    return d.toISOString().slice(0, 7);
  });

  const serieIngresos = await Promise.all(
    doce.map(async (m) => {
      const r = await prisma.factura.aggregate({ where: { mes: m, estado: { not: "anulada" } }, _sum: { total: true } });
      return { mes: m, facturado: r._sum.total ?? 0 };
    }),
  );

  res.json({
    kpis: {
      facturado: facturado._sum.total ?? 0,
      cobrado: cobrado._sum.total ?? 0,
      mora: mora._sum.total ?? 0,
      localesActivos,
    },
    proyeccion: {
      arriendo: Math.round(proyArriendoTotal),
      gc: Math.round(proyGcTotal),
      total: Math.round(proyArriendoTotal + proyGcTotal),
      valorUf,
      fuente: fuenteUf,
    },
    serieIngresos,
    estadoLote: estados.map((e) => ({ estado: e.estado, count: e._count.estado })),
  });
});

// Arrendatarios
router.get("/arrendatarios", async (_req, res) => {
  const arr = await prisma.arrendatario.findMany({ orderBy: { razonSocial: "asc" } });
  res.json(arr);
});

router.get("/arrendatarios/:id", async (req, res) => {
  const a = await prisma.arrendatario.findUnique({ where: { id: req.params.id } });
  if (!a) { res.status(404).json({ error: "Arrendatario no encontrado" }); return; }
  res.json(a);
});

router.post("/arrendatarios", async (req: AuthRequest, res) => {
  const { rut, razonSocial, nombreComercial, email, emailSecundario, telefono } = req.body;
  if (!rut || !razonSocial || !email) { res.status(400).json({ error: "RUT, razón social y email son requeridos" }); return; }
  const a = await prisma.arrendatario.create({
    data: { rut, razonSocial, nombreComercial, email, emailSecundario, telefono },
  });
  res.status(201).json(a);
});

router.put("/arrendatarios/:id", async (req: AuthRequest, res) => {
  const { rut, razonSocial, nombreComercial, email, emailSecundario, telefono } = req.body;
  if (!rut || !razonSocial || !email) { res.status(400).json({ error: "RUT, razón social y email son requeridos" }); return; }
  const a = await prisma.arrendatario.update({
    where: { id: req.params.id },
    data: { rut, razonSocial, nombreComercial, email, emailSecundario, telefono },
  });
  res.json(a);
});

router.delete("/arrendatarios/:id", async (_req, res) => {
  const contratos = await prisma.contrato.count({ where: { arrendatarioId: _req.params.id, activo: true } });
  if (contratos > 0) {
    res.status(409).json({ error: `No se puede eliminar: tiene ${contratos} contrato(s) activo(s).` });
    return;
  }
  await prisma.arrendatario.delete({ where: { id: _req.params.id } });
  res.status(204).end();
});

// Contratos
router.put("/contratos/:id", async (req: AuthRequest, res) => {
  const n = (v: unknown) => (v === "" || v === null || v === undefined ? null : Number(v));
  const c = await prisma.contrato.update({
    where: { id: req.params.id },
    data: {
      ufM2Arriendo:       req.body.ufM2Arriendo       != null ? Number(req.body.ufM2Arriendo) : undefined,
      ufM2Gc:             req.body.ufM2Gc             != null ? Number(req.body.ufM2Gc)       : undefined,
      ufM2Terraza:        "ufM2Terraza"       in req.body ? n(req.body.ufM2Terraza)       : undefined,
      ufM2GcTerraza:      "ufM2GcTerraza"     in req.body ? n(req.body.ufM2GcTerraza)     : undefined,
      fondoPromo:         "fondoPromo"        in req.body ? n(req.body.fondoPromo)         : undefined,
      precioFijoArriendo: "precioFijoArriendo" in req.body ? n(req.body.precioFijoArriendo) : undefined,
      precioFijoGc:       "precioFijoGc"      in req.body ? n(req.body.precioFijoGc)       : undefined,
      vigenciaHasta:      req.body.vigenciaHasta ? new Date(req.body.vigenciaHasta) : undefined,
    },
  });
  res.json(c);
});

router.post("/contratos", async (req: AuthRequest, res) => {
  const { localId, arrendatarioId, ufM2Arriendo, ufM2Gc, vigenciaDesde, vigenciaHasta } = req.body;
  await prisma.contrato.updateMany({ where: { localId, activo: true }, data: { activo: false } });
  const c = await prisma.contrato.create({
    data: { localId, arrendatarioId, ufM2Arriendo, ufM2Gc, vigenciaDesde: new Date(vigenciaDesde), vigenciaHasta: vigenciaHasta ? new Date(vigenciaHasta) : null },
  });
  res.status(201).json(c);
});

// Multas
router.post("/multas", async (req: AuthRequest, res) => {
  const { localId, mes, motivo, monto } = req.body;
  const m = await prisma.multa.create({ data: { localId, mes, motivo, monto, aprobadaPor: req.user!.email } });
  res.status(201).json(m);
});

// Facturas
router.get("/facturas", async (req, res) => {
  const mes = (req.query.mes as string) ?? new Date().toISOString().slice(0, 7);
  const facturas = await prisma.factura.findMany({
    where: { mes },
    orderBy: { createdAt: "desc" },
    include: { local: { select: { id: true, codigo: true } } },
  });
  res.json(facturas);
});

router.get("/facturas/:id", async (req, res) => {
  const f = await prisma.factura.findUnique({
    where: { id: req.params.id },
    include: { local: true, eventos: { orderBy: { at: "desc" } }, pagos: true },
  });
  if (!f) { res.status(404).json({ error: "Factura no encontrada" }); return; }
  res.json(f);
});

router.post("/facturas/:id/anular", async (req: AuthRequest, res) => {
  const { razon } = req.body;
  if (!razon) { res.status(400).json({ error: "Razón requerida" }); return; }
  const f = await prisma.factura.update({ where: { id: req.params.id }, data: { estado: "anulada" } });
  await prisma.facturaEvento.create({ data: { facturaId: f.id, tipo: "anulada", payload: { razon } as object, actor: req.user!.email } });
  res.json(f);
});

export default router;
