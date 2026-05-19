import { Router, Response } from "express";
import { addDays, format } from "date-fns";
import fs from "fs";
import { prisma } from "../../lib/prisma.js";
import { calcularFactura } from "../../services/calculadora.js";
import { generarPdfFactura } from "../../services/pdf.js";
import { enviarFactura } from "../../services/email.js";
import { AuthRequest } from "../../types/index.js";
import path from "path";

const router = Router();

// GET /api/admin/ciclo/:mes/preview
router.get("/:mes/preview", async (req, res: Response): Promise<void> => {
  const { mes } = req.params;

  const [tarifa, locales, luzList, aguaList, multasList] = await Promise.all([
    prisma.tarifa.findUnique({ where: { mes } }),
    prisma.local.findMany({
      where: { estado: { in: ["activo", "vacio"] } },
      include: {
        contratos: { where: { activo: true }, include: { arrendatario: true }, take: 1 },
      },
    }),
    prisma.lecturaLuz.findMany({ where: { mes } }),
    prisma.lecturaAgua.findMany({ where: { mes } }),
    prisma.multa.findMany({ where: { mes, aplicada: false } }),
  ]);

  if (!tarifa) {
    res.status(400).json({ error: "Tarifa del mes no configurada" });
    return;
  }

  const mapaLuz = Object.fromEntries(luzList.map((l) => [l.localId, l]));
  const mapaAgua = Object.fromEntries(aguaList.map((a) => [a.localId, a]));
  const mapaMultas = multasList.reduce<Record<string, number>>((acc, m) => {
    acc[m.localId] = (acc[m.localId] ?? 0) + m.monto;
    return acc;
  }, {});

  const previews = [];
  let totalBruto = 0;
  let sinLecturaLuz = 0;
  let sinLecturaAgua = 0;

  for (const local of locales) {
    const contrato = local.contratos[0];
    const luzLectura = mapaLuz[local.id];
    const aguaLectura = mapaAgua[local.id];

    if (!luzLectura) sinLecturaLuz++;
    if (!aguaLectura) sinLecturaAgua++;

    const facturaAnterior = await prisma.factura.findFirst({
      where: {
        localId: local.id,
        mes: { lt: mes },
        estado: { notIn: ["pagada", "anulada"] },
      },
      orderBy: { mes: "desc" },
    });

    const resultado = calcularFactura({
      m2: local.m2,
      ufM2Arriendo: contrato?.ufM2Arriendo ?? 0,
      ufM2Gc: contrato?.ufM2Gc ?? 0,
      valorUf: tarifa.valorUf,
      kwh: luzLectura?.kwh ?? 0,
      precioKwh: tarifa.precioKwh,
      m3Agua: aguaLectura?.m3 ?? 0,
      precioM3Agua: tarifa.precioM3Agua,
      multas: mapaMultas[local.id] ?? 0,
      descuentos: 0,
      saldoAnterior: facturaAnterior?.total ?? 0,
      iva: tarifa.iva,
      esLocalVacio: local.estado === "vacio",
    });

    totalBruto += resultado.total;
    previews.push({
      local: { id: local.id, codigo: local.codigo, m2: local.m2, estado: local.estado },
      arrendatario: contrato?.arrendatario ?? null,
      resultado,
      alertas: {
        sinLuz: !luzLectura,
        sinAgua: !aguaLectura,
        anomaliaLuz: luzLectura?.anomalia ?? false,
        anomaliaAgua: aguaLectura?.anomalia ?? false,
        tieneMultas: (mapaMultas[local.id] ?? 0) > 0,
      },
    });
  }

  res.json({
    mes,
    tarifa,
    totalFacturas: previews.length,
    totalBruto,
    ivaTotal: previews.reduce((s, p) => s + p.resultado.ivaAmount, 0),
    alertas: { sinLecturaLuz, sinLecturaAgua },
    locales: previews,
  });
});

// POST /api/admin/ciclo/:mes/generar
router.post("/:mes/generar", async (req: AuthRequest, res: Response): Promise<void> => {
  const { mes } = req.params;

  const existentes = await prisma.factura.count({ where: { mes, estado: { not: "anulada" } } });
  if (existentes > 0) {
    res.status(409).json({ error: `Ya existen ${existentes} facturas para el mes ${mes}` });
    return;
  }

  const [tarifa, locales, luzList, aguaList, multasList] = await Promise.all([
    prisma.tarifa.findUnique({ where: { mes } }),
    prisma.local.findMany({
      where: { estado: { in: ["activo", "vacio"] } },
      include: {
        contratos: { where: { activo: true }, include: { arrendatario: true }, take: 1 },
      },
    }),
    prisma.lecturaLuz.findMany({ where: { mes } }),
    prisma.lecturaAgua.findMany({ where: { mes } }),
    prisma.multa.findMany({ where: { mes, aplicada: false } }),
  ]);

  if (!tarifa) {
    res.status(400).json({ error: "Tarifa del mes no configurada" });
    return;
  }

  const mapaLuz = Object.fromEntries(luzList.map((l) => [l.localId, l]));
  const mapaAgua = Object.fromEntries(aguaList.map((a) => [a.localId, a]));
  const mapaMultas = multasList.reduce<Record<string, number>>((acc, m) => {
    acc[m.localId] = (acc[m.localId] ?? 0) + m.monto;
    return acc;
  }, {});

  const vencimiento = addDays(new Date(`${mes}-01`), 20);
  const generadas = [];

  for (const local of locales) {
    const contrato = local.contratos[0];

    const facturaAnterior = await prisma.factura.findFirst({
      where: { localId: local.id, mes: { lt: mes }, estado: { notIn: ["pagada", "anulada"] } },
      orderBy: { mes: "desc" },
    });

    const resultado = calcularFactura({
      m2: local.m2,
      ufM2Arriendo: contrato?.ufM2Arriendo ?? 0,
      ufM2Gc: contrato?.ufM2Gc ?? 0,
      valorUf: tarifa.valorUf,
      kwh: mapaLuz[local.id]?.kwh ?? 0,
      precioKwh: tarifa.precioKwh,
      m3Agua: mapaAgua[local.id]?.m3 ?? 0,
      precioM3Agua: tarifa.precioM3Agua,
      multas: mapaMultas[local.id] ?? 0,
      descuentos: 0,
      saldoAnterior: facturaAnterior?.total ?? 0,
      iva: tarifa.iva,
      esLocalVacio: local.estado === "vacio",
    });

    const factura = await prisma.factura.create({
      data: {
        localId: local.id,
        mes,
        contratoSnapshot: (contrato ?? {}) as object,
        itemsJson: resultado.items as object,
        subtotal: resultado.subtotal,
        iva: resultado.ivaAmount,
        total: resultado.total,
        saldoAnterior: resultado.items.saldoAnterior,
        estado: "emitida",
        generadaAt: new Date(),
        vencimiento,
      },
    });

    await prisma.facturaEvento.create({
      data: { facturaId: factura.id, tipo: "generada", actor: req.user!.email },
    });

    // Marcar multas como aplicadas
    await prisma.multa.updateMany({ where: { localId: local.id, mes, aplicada: false }, data: { aplicada: true } });

    generadas.push({ facturaId: factura.id, localCodigo: local.codigo, total: resultado.total });
  }

  await prisma.auditoria.create({
    data: {
      actor: req.user!.email,
      rol: req.user!.rol,
      accion: "generar_lote",
      recurso: "factura",
      despuesJson: { mes, cantidad: generadas.length } as object,
    },
  });

  res.status(201).json({ generadas: generadas.length, facturas: generadas });
});

// POST /api/admin/ciclo/:mes/enviar
router.post("/:mes/enviar", async (req: AuthRequest, res: Response): Promise<void> => {
  const { mes } = req.params;

  const facturas = await prisma.factura.findMany({
    where: { mes, estado: { in: ["emitida", "enviada"] } },
    include: { local: { include: { contratos: { where: { activo: true }, include: { arrendatario: true }, take: 1 } } } },
  });

  const storageDir = process.env.STORAGE_PATH ?? "./storage";
  const enviadas = [];
  const errores = [];

  for (const factura of facturas) {
    const contrato = factura.local.contratos[0];
    if (!contrato?.arrendatario?.email) {
      errores.push(`Sin email: local ${factura.local.codigo}`);
      continue;
    }

    try {
      const pdfPath = path.join(storageDir, "pdfs", `${factura.id}.pdf`);

      if (!fs.existsSync(pdfPath)) {
        await generarPdfFactura({
          folio: factura.folio ?? factura.id.slice(-8).toUpperCase(),
          mes,
          localCodigo: factura.local.codigo,
          localM2: factura.local.m2,
          arrendatarioNombre: contrato.arrendatario.razonSocial,
          arrendatarioRut: contrato.arrendatario.rut,
          items: factura.itemsJson as unknown as Parameters<typeof generarPdfFactura>[0]["items"],
          subtotal: factura.subtotal,
          ivaAmount: factura.iva,
          total: factura.total,
          vencimiento: factura.vencimiento!,
        }, pdfPath);
      }

      await enviarFactura({
        destinatario: contrato.arrendatario.email,
        nombreArrendatario: contrato.arrendatario.razonSocial,
        localCodigo: factura.local.codigo,
        mes,
        total: factura.total,
        pdfPath,
      });

      await prisma.factura.update({ where: { id: factura.id }, data: { estado: "enviada", enviadaAt: new Date(), pdfUrl: pdfPath } });
      await prisma.facturaEvento.create({ data: { facturaId: factura.id, tipo: "enviada", actor: req.user!.email } });

      enviadas.push(factura.id);
    } catch (err) {
      errores.push(`Error enviando ${factura.local.codigo}: ${(err as Error).message}`);
    }
  }

  res.json({ enviadas: enviadas.length, errores });
});

export default router;
