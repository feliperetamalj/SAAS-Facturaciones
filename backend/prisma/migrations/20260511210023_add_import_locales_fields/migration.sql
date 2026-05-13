-- AlterTable
ALTER TABLE "Arrendatario" ADD COLUMN     "giro" TEXT,
ALTER COLUMN "email" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Contrato" ADD COLUMN     "fondoPromo" DOUBLE PRECISION,
ADD COLUMN     "precioFijoArriendo" DOUBLE PRECISION,
ADD COLUMN     "precioFijoGc" DOUBLE PRECISION,
ADD COLUMN     "ufM2GcTerraza" DOUBLE PRECISION,
ADD COLUMN     "ufM2Terraza" DOUBLE PRECISION;
