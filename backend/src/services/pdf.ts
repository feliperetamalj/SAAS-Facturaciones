import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

interface ItemFactura {
  arriendo: number;
  gastosComunales: number;
  luz: number;
  agua: number;
  multas: number;
  descuentos: number;
  saldoAnterior: number;
}

interface DatosFacturaPDF {
  folio: string;
  mes: string;
  localCodigo: string;
  localM2: number;
  arrendatarioNombre: string;
  arrendatarioRut: string;
  items: ItemFactura;
  subtotal: number;
  ivaAmount: number;
  total: number;
  vencimiento: Date;
}

const clp = (n: number) =>
  new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(n);

export async function generarPdfFactura(datos: DatosFacturaPDF, outputPath: string): Promise<string> {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 40 });
    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    // Header
    doc.fontSize(20).fillColor("#4A8A95").text("ALTO LAS RASTRAS", 40, 40);
    doc.fontSize(10).fillColor("#6B635A").text("Centro Comercial | Facturación Mensual", 40, 65);
    doc.fontSize(14).fillColor("#2A2521").text(`Folio: ${datos.folio}`, 400, 40, { align: "right" });
    doc.fontSize(10).fillColor("#6B635A").text(
      `Mes: ${new Date(`${datos.mes}-01`).toLocaleDateString("es-CL", { month: "long", year: "numeric" })}`,
      400, 58, { align: "right" }
    );
    doc.moveTo(40, 90).lineTo(555, 90).strokeColor("#4A8A95").lineWidth(2).stroke();

    // Datos del local
    doc.moveDown(0.5);
    doc.fontSize(11).fillColor("#2A2521").text("Datos del local", 40, 100);
    doc.fontSize(10).fillColor("#6B635A");
    doc.text(`Local: ${datos.localCodigo}  |  Superficie: ${datos.localM2} m²`, 40, 116);
    doc.text(`Arrendatario: ${datos.arrendatarioNombre}`, 40, 130);
    doc.text(`RUT: ${datos.arrendatarioRut}`, 40, 144);

    // Tabla de ítems
    const tY = 175;
    doc.rect(40, tY, 515, 22).fill("#F2EEE5");
    doc.fontSize(10).fillColor("#2A2521");
    doc.text("Concepto", 50, tY + 6);
    doc.text("Monto", 480, tY + 6, { align: "right", width: 70 });
    doc.moveTo(40, tY + 22).lineTo(555, tY + 22).strokeColor("#D0C8BE").lineWidth(0.5).stroke();

    const filas: [string, number][] = [
      ["Arriendo", datos.items.arriendo],
      ["Gastos Comunes", datos.items.gastosComunales],
      ["Luz (kWh)", datos.items.luz],
      ["Agua (m³)", datos.items.agua],
      ...(datos.items.multas > 0 ? [["Multas", datos.items.multas] as [string, number]] : []),
      ...(datos.items.descuentos > 0 ? [["Descuentos", -datos.items.descuentos] as [string, number]] : []),
      ...(datos.items.saldoAnterior > 0 ? [["Saldo anterior", datos.items.saldoAnterior] as [string, number]] : []),
    ];

    let y = tY + 28;
    for (const [label, monto] of filas) {
      doc.fillColor("#2A2521").text(label, 50, y);
      doc.text(clp(monto), 480, y, { align: "right", width: 70 });
      doc.moveTo(40, y + 16).lineTo(555, y + 16).strokeColor("#EBE6DF").lineWidth(0.5).stroke();
      y += 20;
    }

    // Totales
    y += 4;
    doc.moveTo(40, y).lineTo(555, y).strokeColor("#4A8A95").lineWidth(1).stroke();
    y += 8;
    doc.fillColor("#2A2521").text("Subtotal", 50, y);
    doc.text(clp(datos.subtotal), 480, y, { align: "right", width: 70 });
    y += 18;
    doc.text("IVA (19%)", 50, y);
    doc.text(clp(datos.ivaAmount), 480, y, { align: "right", width: 70 });
    y += 18;
    doc.rect(40, y - 4, 515, 26).fill("#4A8A95");
    doc.fontSize(12).fillColor("#FFFFFF").text("TOTAL A PAGAR", 50, y + 2);
    doc.text(clp(datos.total), 480, y + 2, { align: "right", width: 70 });

    // Vencimiento
    y += 40;
    doc.fontSize(10).fillColor("#D88864").text(
      `Fecha de vencimiento: ${datos.vencimiento.toLocaleDateString("es-CL")}`,
      40, y
    );

    // Footer
    doc.fontSize(8).fillColor("#6B635A").text(
      "Centro Comercial Alto Las Rastras  ·  Para consultas: facturacion@alr.cl",
      40, 780, { align: "center" }
    );

    doc.end();
    stream.on("finish", () => resolve(outputPath));
    stream.on("error", reject);
  });
}
