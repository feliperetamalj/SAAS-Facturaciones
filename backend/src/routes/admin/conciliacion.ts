import { Router, Response } from "express";
import { prisma } from "../../lib/prisma.js";
import { evaluarMatch, calcularSaldoPendiente } from "../../services/calculadora.js";
import { AuthRequest } from "../../types/index.js";

const router = Router();

// GET /api/admin/conciliacion/cola
router.get("/cola", async (_req, res: Response): Promise<void> => {
  const comprobantes = await prisma.comprobante.findMany({
    where: { estado: "pendiente" },
    orderBy: { recibidoAt: "desc" },
    include: { pagos: { include: { factura: { include: { local: true } } } } },
  });

  const cola = await Promise.all(
    comprobantes.map(async (c) => {
      // Intentar match automático
      let sugerencia = null;
      if (c.rutDetectado && c.montoDetectado) {
        const arrendatario = await prisma.arrendatario.findUnique({ where: { rut: c.rutDetectado } });
        if (arrendatario) {
          const contratos = await prisma.contrato.findMany({
            where: { arrendatarioId: arrendatario.id, activo: true },
            include: { local: true },
          });
          for (const contrato of contratos) {
            const facturaAbierta = await prisma.factura.findFirst({
              where: { localId: contrato.localId, estado: { in: ["enviada", "emitida", "vencida", "mora", "parcial"] } },
              orderBy: { mes: "desc" },
            });
            if (facturaAbierta) {
              const modoMatch = evaluarMatch({ montoFactura: facturaAbierta.total, montoPago: c.montoDetectado!, tolerancia: 1000 });
              if (modoMatch !== "sin_match") {
                sugerencia = { facturaId: facturaAbierta.id, modoMatch, factura: facturaAbierta };
                break;
              }
            }
          }
        }
      }

      return { ...c, sugerencia };
    }),
  );

  const stats = {
    total: cola.length,
    autoMatch: cola.filter((c) => c.sugerencia).length,
    sinMatch: cola.filter((c) => !c.sugerencia).length,
  };

  res.json({ stats, cola });
});

// POST /api/admin/conciliacion/:id/aprobar
router.post("/:id/aprobar", async (req: AuthRequest, res: Response): Promise<void> => {
  const { facturaId, monto } = req.body;
  const comprobante = await prisma.comprobante.findUnique({ where: { id: req.params.id } });
  if (!comprobante) { res.status(404).json({ error: "Comprobante no encontrado" }); return; }

  const factura = await prisma.factura.findUnique({ where: { id: facturaId }, include: { pagos: true } });
  if (!factura) { res.status(404).json({ error: "Factura no encontrada" }); return; }

  const montoPago = monto ?? comprobante.montoDetectado ?? 0;
  const pagosAnteriores = factura.pagos.reduce((s, p) => s + p.monto, 0);
  const saldoPendiente = calcularSaldoPendiente(factura.total, [pagosAnteriores]);
  const modoMatch = evaluarMatch({ montoFactura: factura.total, montoPago, tolerancia: 1000 });

  const pago = await prisma.pago.create({
    data: { facturaId, comprobanteId: comprobante.id, monto: montoPago, modoMatch, conciliadoAt: new Date(), conciliadoPor: req.user!.email },
  });

  const nuevoSaldo = calcularSaldoPendiente(factura.total, [pagosAnteriores, montoPago]);
  const nuevoEstado = nuevoSaldo <= 0 ? "pagada" : "parcial";

  await prisma.factura.update({ where: { id: facturaId }, data: { estado: nuevoEstado } });
  await prisma.facturaEvento.create({
    data: { facturaId, tipo: nuevoEstado === "pagada" ? "pagada" : "pago_parcial", payload: { monto: montoPago, saldoPendiente: nuevoSaldo } as object, actor: req.user!.email },
  });
  await prisma.comprobante.update({ where: { id: req.params.id }, data: { estado: "conciliado" } });

  res.json({ pago, estadoFactura: nuevoEstado, saldoPendiente: nuevoSaldo });
});

// POST /api/admin/conciliacion/:id/rechazar
router.post("/:id/rechazar", async (req: AuthRequest, res: Response): Promise<void> => {
  await prisma.comprobante.update({ where: { id: req.params.id }, data: { estado: "rechazado" } });
  res.json({ ok: true });
});

export default router;
