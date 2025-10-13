/*
  Warnings:

  - The primary key for the `ExpectedProduction` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `orderId` on the `ExpectedProduction` table. All the data in the column will be lost.
  - You are about to drop the column `quantity` on the `ExpectedProduction` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[externalProductionOrderId,productId]` on the table `ExpectedProduction` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `externalProductionOrderId` to the `ExpectedProduction` table without a default value. This is not possible if the table is not empty.
  - The required column `id` was added to the `ExpectedProduction` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - Added the required column `quantityExpected` to the `ExpectedProduction` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."ExpectedProduction" DROP CONSTRAINT "ExpectedProduction_orderId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ExternalProductionOrderItem" DROP CONSTRAINT "ExternalProductionOrderItem_externalProductionOrderId_fkey";

-- AlterTable
ALTER TABLE "public"."ExpectedProduction" DROP CONSTRAINT "ExpectedProduction_pkey",
DROP COLUMN "orderId",
DROP COLUMN "quantity",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "externalProductionOrderId" TEXT NOT NULL,
ADD COLUMN     "id" TEXT NOT NULL,
ADD COLUMN     "quantityExpected" DECIMAL(65,30) NOT NULL,
ADD CONSTRAINT "ExpectedProduction_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "public"."ExternalProductionOrder" ADD COLUMN     "pickupUserId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "ExpectedProduction_externalProductionOrderId_productId_key" ON "public"."ExpectedProduction"("externalProductionOrderId", "productId");

-- AddForeignKey
ALTER TABLE "public"."ExternalProductionOrder" ADD CONSTRAINT "ExternalProductionOrder_pickupUserId_fkey" FOREIGN KEY ("pickupUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExternalProductionOrderItem" ADD CONSTRAINT "ExternalProductionOrderItem_externalProductionOrderId_fkey" FOREIGN KEY ("externalProductionOrderId") REFERENCES "public"."ExternalProductionOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExpectedProduction" ADD CONSTRAINT "ExpectedProduction_externalProductionOrderId_fkey" FOREIGN KEY ("externalProductionOrderId") REFERENCES "public"."ExternalProductionOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
