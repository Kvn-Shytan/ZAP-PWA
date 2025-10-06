/*
  Warnings:

  - You are about to alter the column `amount` on the `AssemblerPayment` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `quantitySent` on the `ExternalProductionOrderItem` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `quantity` on the `InventoryMovement` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `cost` on the `OverheadCost` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `priceUSD` on the `Product` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `priceARS` on the `Product` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `stock` on the `Product` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `lowStockThreshold` on the `Product` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `quantity` on the `ProductComponent` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `quantity` on the `ProductOverhead` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `quantityReceived` on the `ReceivedProduction` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.
  - You are about to alter the column `precio` on the `TrabajoDeArmado` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(65,30)`.

*/
-- AlterTable
ALTER TABLE "public"."AssemblerPayment" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "public"."ExternalProductionOrderItem" ALTER COLUMN "quantitySent" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "public"."InventoryMovement" ALTER COLUMN "quantity" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "public"."OverheadCost" ALTER COLUMN "cost" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "public"."Product" ALTER COLUMN "priceUSD" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "priceARS" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "stock" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "lowStockThreshold" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "public"."ProductComponent" ALTER COLUMN "quantity" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "public"."ProductOverhead" ALTER COLUMN "quantity" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "public"."ReceivedProduction" ALTER COLUMN "quantityReceived" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "public"."TrabajoDeArmado" ALTER COLUMN "precio" SET DATA TYPE DECIMAL(65,30);
