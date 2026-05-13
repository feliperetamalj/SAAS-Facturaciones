import nodemailer from "nodemailer";
import path from "path";
import fs from "fs";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST ?? "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

interface EnvioFacturaOpts {
  destinatario: string;
  nombreArrendatario: string;
  localCodigo: string;
  mes: string;
  total: number;
  pdfPath: string;
}

export async function enviarFactura(opts: EnvioFacturaOpts): Promise<void> {
  const mesFormateado = new Date(`${opts.mes}-01`).toLocaleDateString("es-CL", {
    month: "long",
    year: "numeric",
  });

  const pdfBuffer = fs.readFileSync(opts.pdfPath);

  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? "Facturación ALR <facturacion@alr.cl>",
    to: opts.destinatario,
    subject: `Factura ${mesFormateado} – Local ${opts.localCodigo} · Alto Las Rastras`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4A8A95;">Facturación mensual – Alto Las Rastras</h2>
        <p>Estimado/a <strong>${opts.nombreArrendatario}</strong>,</p>
        <p>Adjunto encontrará la factura correspondiente al mes de <strong>${mesFormateado}</strong>
           para el Local <strong>${opts.localCodigo}</strong>.</p>
        <div style="background:#F2EEE5; padding:16px; border-radius:8px; margin:16px 0;">
          <p style="margin:0; font-size:18px;">
            <strong>Total a pagar:</strong>
            <span style="color:#4A8A95; font-size:24px; font-weight:bold;">
              ${new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(opts.total)}
            </span>
          </p>
        </div>
        <p>Para consultas o reclamos, responda a este correo o acceda al portal del arrendatario.</p>
        <p style="color:#6B635A; font-size:12px;">Centro Comercial Alto Las Rastras</p>
      </div>
    `,
    attachments: [
      {
        filename: `Factura_${opts.localCodigo}_${opts.mes}.pdf`,
        content: pdfBuffer,
        contentType: "application/pdf",
      },
    ],
  });
}

export async function verificarConexionSMTP(): Promise<boolean> {
  try {
    await transporter.verify();
    return true;
  } catch {
    return false;
  }
}
