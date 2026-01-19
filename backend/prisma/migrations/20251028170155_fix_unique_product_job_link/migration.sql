/*
  Warnings:

  - A unique constraint covering the columns `[productId]` on the table `ProductoTrabajoArmado` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "ProductoTrabajoArmado_productId_key" ON "public"."ProductoTrabajoArmado"("productId");
