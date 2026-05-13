import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Borrando datos en orden de dependencias…");

  const pagos         = await prisma.pago.deleteMany();
  const eventos       = await prisma.facturaEvento.deleteMany();
  const facturas      = await prisma.factura.deleteMany();
  const multas        = await prisma.multa.deleteMany();
  const lecturasLuz   = await prisma.lecturaLuz.deleteMany();
  const lecturasAgua  = await prisma.lecturaAgua.deleteMany();
  const contratos     = await prisma.contrato.deleteMany();
  const locales       = await prisma.local.deleteMany();
  const arrendatarios = await prisma.arrendatario.deleteMany();

  console.log("✓ Pagos:          ", pagos.count);
  console.log("✓ Eventos factura:", eventos.count);
  console.log("✓ Facturas:       ", facturas.count);
  console.log("✓ Multas:         ", multas.count);
  console.log("✓ Lecturas luz:   ", lecturasLuz.count);
  console.log("✓ Lecturas agua:  ", lecturasAgua.count);
  console.log("✓ Contratos:      ", contratos.count);
  console.log("✓ Locales:        ", locales.count);
  console.log("✓ Arrendatarios:  ", arrendatarios.count);
  console.log("\nBase de datos limpia. Listo para reimportar el Excel.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
