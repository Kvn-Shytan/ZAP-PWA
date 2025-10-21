/*
  Warnings:

  - A unique constraint covering the columns `[orderNumber]` on the table `ExternalProductionOrder` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `orderNumber` to the `ExternalProductionOrder` table without a default value. This is not possible if the table is not empty.

*/
-- Step 1: Add the column as nullable
ALTER TABLE "public"."ExternalProductionOrder" ADD COLUMN     "orderNumber" TEXT;

-- Step 2: Backfill existing rows with a temporary unique value based on the existing ID
UPDATE "public"."ExternalProductionOrder" SET "orderNumber" = 'TEMP-' || id;

-- Step 3: Now that all rows have a value, make the column non-nullable
ALTER TABLE "public"."ExternalProductionOrder" ALTER COLUMN "orderNumber" SET NOT NULL;

-- CreateTable
CREATE TABLE "public"."OrderSequence" (
    "date" TEXT NOT NULL,
    "lastSequence" INTEGER NOT NULL,

    CONSTRAINT "OrderSequence_pkey" PRIMARY KEY ("date")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExternalProductionOrder_orderNumber_key" ON "public"."ExternalProductionOrder"("orderNumber");