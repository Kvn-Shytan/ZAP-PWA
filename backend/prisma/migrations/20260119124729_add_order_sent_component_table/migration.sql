-- CreateTable
CREATE TABLE "OrderSentComponent" (
    "id" TEXT NOT NULL,
    "externalProductionOrderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantitySent" INTEGER NOT NULL,

    CONSTRAINT "OrderSentComponent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrderSentComponent_externalProductionOrderId_productId_key" ON "OrderSentComponent"("externalProductionOrderId", "productId");

-- AddForeignKey
ALTER TABLE "OrderSentComponent" ADD CONSTRAINT "OrderSentComponent_externalProductionOrderId_fkey" FOREIGN KEY ("externalProductionOrderId") REFERENCES "ExternalProductionOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderSentComponent" ADD CONSTRAINT "OrderSentComponent_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
