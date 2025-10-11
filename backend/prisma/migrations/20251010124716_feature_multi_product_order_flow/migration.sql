/*
  Warnings:

  - The values [DELIVERED,RETURNED,PARTIALLY_RECEIVED] on the enum `ExternalProductionOrderStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the `ReceivedProduction` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."ExternalProductionOrderStatus_new" AS ENUM ('PENDING_DELIVERY', 'OUT_FOR_DELIVERY', 'DELIVERY_FAILED', 'IN_ASSEMBLY', 'PENDING_PICKUP', 'RETURN_IN_TRANSIT', 'COMPLETED', 'COMPLETED_WITH_NOTES', 'COMPLETED_WITH_DISCREPANCY', 'CANCELLED');
ALTER TABLE "public"."ExternalProductionOrder" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."ExternalProductionOrder" ALTER COLUMN "status" TYPE "public"."ExternalProductionOrderStatus_new" USING ("status"::text::"public"."ExternalProductionOrderStatus_new");
ALTER TYPE "public"."ExternalProductionOrderStatus" RENAME TO "ExternalProductionOrderStatus_old";
ALTER TYPE "public"."ExternalProductionOrderStatus_new" RENAME TO "ExternalProductionOrderStatus";
DROP TYPE "public"."ExternalProductionOrderStatus_old";
ALTER TABLE "public"."ExternalProductionOrder" ALTER COLUMN "status" SET DEFAULT 'PENDING_DELIVERY';
COMMIT;

-- DropForeignKey
ALTER TABLE "public"."ReceivedProduction" DROP CONSTRAINT "ReceivedProduction_externalProductionOrderId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ReceivedProduction" DROP CONSTRAINT "ReceivedProduction_productId_fkey";

-- DropTable
DROP TABLE "public"."ReceivedProduction";

-- CreateTable
CREATE TABLE "public"."ExpectedProduction" (
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "ExpectedProduction_pkey" PRIMARY KEY ("orderId","productId")
);

-- AddForeignKey
ALTER TABLE "public"."ExpectedProduction" ADD CONSTRAINT "ExpectedProduction_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."ExternalProductionOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExpectedProduction" ADD CONSTRAINT "ExpectedProduction_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
