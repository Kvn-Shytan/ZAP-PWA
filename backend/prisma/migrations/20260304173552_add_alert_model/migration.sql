-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('INACTIVITY', 'LOW_STOCK', 'QUALITY_ISSUE', 'OTHER');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('ACTIVE', 'DISMISSED', 'RESOLVED');

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "type" "AlertType" NOT NULL DEFAULT 'INACTIVITY',
    "message" TEXT NOT NULL,
    "status" "AlertStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "externalProductionOrderId" TEXT,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Alert_externalProductionOrderId_idx" ON "Alert"("externalProductionOrderId");

-- CreateIndex
CREATE INDEX "Alert_status_idx" ON "Alert"("status");

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_externalProductionOrderId_fkey" FOREIGN KEY ("externalProductionOrderId") REFERENCES "ExternalProductionOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
