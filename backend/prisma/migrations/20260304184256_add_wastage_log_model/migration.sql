-- CreateTable
CREATE TABLE "WastageLog" (
    "id" TEXT NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,
    "reason" TEXT NOT NULL,
    "costDeducted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "productId" TEXT NOT NULL,
    "assemblerId" TEXT,
    "externalProductionOrderId" TEXT,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "WastageLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WastageLog_assemblerId_idx" ON "WastageLog"("assemblerId");

-- CreateIndex
CREATE INDEX "WastageLog_externalProductionOrderId_idx" ON "WastageLog"("externalProductionOrderId");

-- CreateIndex
CREATE INDEX "WastageLog_costDeducted_idx" ON "WastageLog"("costDeducted");

-- AddForeignKey
ALTER TABLE "WastageLog" ADD CONSTRAINT "WastageLog_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WastageLog" ADD CONSTRAINT "WastageLog_assemblerId_fkey" FOREIGN KEY ("assemblerId") REFERENCES "Assembler"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WastageLog" ADD CONSTRAINT "WastageLog_externalProductionOrderId_fkey" FOREIGN KEY ("externalProductionOrderId") REFERENCES "ExternalProductionOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WastageLog" ADD CONSTRAINT "WastageLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
