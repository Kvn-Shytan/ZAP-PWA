/*
  Warnings:

  - You are about to drop the `OrderNote` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."OrderNote" DROP CONSTRAINT "OrderNote_authorId_fkey";

-- DropForeignKey
ALTER TABLE "public"."OrderNote" DROP CONSTRAINT "OrderNote_externalProductionOrderId_fkey";

-- AlterTable
ALTER TABLE "public"."ExternalProductionOrder" ADD COLUMN     "notes" TEXT;

-- AlterTable
ALTER TABLE "public"."InventoryMovement" ADD COLUMN     "externalProductionOrderId" TEXT;

-- DropTable
DROP TABLE "public"."OrderNote";

-- CreateIndex
CREATE INDEX "InventoryMovement_externalProductionOrderId_idx" ON "public"."InventoryMovement"("externalProductionOrderId");

-- AddForeignKey
ALTER TABLE "public"."InventoryMovement" ADD CONSTRAINT "InventoryMovement_externalProductionOrderId_fkey" FOREIGN KEY ("externalProductionOrderId") REFERENCES "public"."ExternalProductionOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
