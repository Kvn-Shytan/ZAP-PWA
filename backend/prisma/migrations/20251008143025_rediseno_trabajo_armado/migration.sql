/*
  Warnings:

  - You are about to drop the column `productoId` on the `TrabajoDeArmado` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."TrabajoDeArmado" DROP CONSTRAINT "TrabajoDeArmado_productoId_fkey";

-- DropIndex
DROP INDEX "public"."TrabajoDeArmado_productoId_key";

-- AlterTable
ALTER TABLE "public"."TrabajoDeArmado" DROP COLUMN "productoId";

-- CreateTable
CREATE TABLE "public"."ProductoTrabajoArmado" (
    "productId" TEXT NOT NULL,
    "trabajoId" TEXT NOT NULL,

    CONSTRAINT "ProductoTrabajoArmado_pkey" PRIMARY KEY ("productId","trabajoId")
);

-- AddForeignKey
ALTER TABLE "public"."ProductoTrabajoArmado" ADD CONSTRAINT "ProductoTrabajoArmado_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProductoTrabajoArmado" ADD CONSTRAINT "ProductoTrabajoArmado_trabajoId_fkey" FOREIGN KEY ("trabajoId") REFERENCES "public"."TrabajoDeArmado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
