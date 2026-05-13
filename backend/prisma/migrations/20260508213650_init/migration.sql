-- CreateTable
CREATE TABLE "Local" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT,
    "m2" DOUBLE PRECISION NOT NULL,
    "categoria" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'activo',
    "piso" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Local_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Arrendatario" (
    "id" TEXT NOT NULL,
    "rut" TEXT NOT NULL,
    "razonSocial" TEXT NOT NULL,
    "nombreComercial" TEXT,
    "email" TEXT NOT NULL,
    "emailSecundario" TEXT,
    "telefono" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Arrendatario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contrato" (
    "id" TEXT NOT NULL,
    "localId" TEXT NOT NULL,
    "arrendatarioId" TEXT NOT NULL,
    "ufM2Arriendo" DOUBLE PRECISION NOT NULL,
    "ufM2Gc" DOUBLE PRECISION NOT NULL,
    "vigenciaDesde" TIMESTAMP(3) NOT NULL,
    "vigenciaHasta" TIMESTAMP(3),
    "descuentosJson" JSONB,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contrato_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tarifa" (
    "id" TEXT NOT NULL,
    "mes" TEXT NOT NULL,
    "valorUf" DOUBLE PRECISION NOT NULL,
    "iva" DOUBLE PRECISION NOT NULL DEFAULT 0.19,
    "precioKwh" DOUBLE PRECISION NOT NULL,
    "precioM3Agua" DOUBLE PRECISION NOT NULL,
    "toleranciaPago" DOUBLE PRECISION NOT NULL DEFAULT 1000,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tarifa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TarifaCategoria" (
    "id" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "ufM2Arriendo" DOUBLE PRECISION NOT NULL,
    "ufM2Gc" DOUBLE PRECISION NOT NULL,
    "vigenciaDesde" TIMESTAMP(3) NOT NULL,
    "vigenciaHasta" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TarifaCategoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LecturaLuz" (
    "id" TEXT NOT NULL,
    "localId" TEXT NOT NULL,
    "mes" TEXT NOT NULL,
    "lecturaAnterior" DOUBLE PRECISION NOT NULL,
    "lecturaActual" DOUBLE PRECISION NOT NULL,
    "kwh" DOUBLE PRECISION NOT NULL,
    "fuente" TEXT NOT NULL DEFAULT 'excel',
    "anomalia" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LecturaLuz_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LecturaAgua" (
    "id" TEXT NOT NULL,
    "localId" TEXT NOT NULL,
    "mes" TEXT NOT NULL,
    "lecturaAnterior" DOUBLE PRECISION NOT NULL,
    "lecturaActual" DOUBLE PRECISION NOT NULL,
    "m3" DOUBLE PRECISION NOT NULL,
    "fuente" TEXT NOT NULL DEFAULT 'manual',
    "anomalia" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LecturaAgua_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Factura" (
    "id" TEXT NOT NULL,
    "localId" TEXT NOT NULL,
    "mes" TEXT NOT NULL,
    "contratoSnapshot" JSONB NOT NULL,
    "itemsJson" JSONB NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "iva" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "saldoAnterior" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "estado" TEXT NOT NULL DEFAULT 'borrador',
    "pdfUrl" TEXT,
    "folio" TEXT,
    "generadaAt" TIMESTAMP(3),
    "enviadaAt" TIMESTAMP(3),
    "vencimiento" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Factura_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacturaEvento" (
    "id" TEXT NOT NULL,
    "facturaId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "payload" JSONB,
    "actor" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FacturaEvento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Multa" (
    "id" TEXT NOT NULL,
    "localId" TEXT NOT NULL,
    "mes" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "monto" DOUBLE PRECISION NOT NULL,
    "aprobadaPor" TEXT NOT NULL,
    "aplicada" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Multa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comprobante" (
    "id" TEXT NOT NULL,
    "fuenteEmail" TEXT,
    "rawAttachmentUrl" TEXT,
    "ocrJson" JSONB,
    "rutDetectado" TEXT,
    "montoDetectado" DOUBLE PRECISION,
    "fechaDetectada" TIMESTAMP(3),
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "recibidoAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comprobante_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pago" (
    "id" TEXT NOT NULL,
    "facturaId" TEXT NOT NULL,
    "comprobanteId" TEXT,
    "monto" DOUBLE PRECISION NOT NULL,
    "modoMatch" TEXT NOT NULL DEFAULT 'manual',
    "conciliadoAt" TIMESTAMP(3),
    "conciliadoPor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pago_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "rol" TEXT NOT NULL,
    "arrendatarioId" TEXT,
    "localId" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Auditoria" (
    "id" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "rol" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "recurso" TEXT NOT NULL,
    "recursoId" TEXT,
    "antesJson" JSONB,
    "despuesJson" JSONB,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Local_codigo_key" ON "Local"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Arrendatario_rut_key" ON "Arrendatario"("rut");

-- CreateIndex
CREATE UNIQUE INDEX "Tarifa_mes_key" ON "Tarifa"("mes");

-- CreateIndex
CREATE UNIQUE INDEX "TarifaCategoria_categoria_vigenciaDesde_key" ON "TarifaCategoria"("categoria", "vigenciaDesde");

-- CreateIndex
CREATE UNIQUE INDEX "LecturaLuz_localId_mes_key" ON "LecturaLuz"("localId", "mes");

-- CreateIndex
CREATE UNIQUE INDEX "LecturaAgua_localId_mes_key" ON "LecturaAgua"("localId", "mes");

-- CreateIndex
CREATE UNIQUE INDEX "Factura_folio_key" ON "Factura"("folio");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_arrendatarioId_key" ON "Usuario"("arrendatarioId");

-- AddForeignKey
ALTER TABLE "Contrato" ADD CONSTRAINT "Contrato_localId_fkey" FOREIGN KEY ("localId") REFERENCES "Local"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contrato" ADD CONSTRAINT "Contrato_arrendatarioId_fkey" FOREIGN KEY ("arrendatarioId") REFERENCES "Arrendatario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LecturaLuz" ADD CONSTRAINT "LecturaLuz_localId_fkey" FOREIGN KEY ("localId") REFERENCES "Local"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LecturaAgua" ADD CONSTRAINT "LecturaAgua_localId_fkey" FOREIGN KEY ("localId") REFERENCES "Local"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Factura" ADD CONSTRAINT "Factura_localId_fkey" FOREIGN KEY ("localId") REFERENCES "Local"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacturaEvento" ADD CONSTRAINT "FacturaEvento_facturaId_fkey" FOREIGN KEY ("facturaId") REFERENCES "Factura"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Multa" ADD CONSTRAINT "Multa_localId_fkey" FOREIGN KEY ("localId") REFERENCES "Local"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pago" ADD CONSTRAINT "Pago_facturaId_fkey" FOREIGN KEY ("facturaId") REFERENCES "Factura"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pago" ADD CONSTRAINT "Pago_comprobanteId_fkey" FOREIGN KEY ("comprobanteId") REFERENCES "Comprobante"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_arrendatarioId_fkey" FOREIGN KEY ("arrendatarioId") REFERENCES "Arrendatario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
