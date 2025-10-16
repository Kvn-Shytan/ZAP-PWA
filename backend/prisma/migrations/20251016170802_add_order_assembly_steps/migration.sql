-- CreateTable
CREATE TABLE "public"."OrderAssemblyStep" (
    "id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "externalProductionOrderId" TEXT NOT NULL,
    "trabajoDeArmadoId" TEXT NOT NULL,

    CONSTRAINT "OrderAssemblyStep_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrderAssemblyStep_externalProductionOrderId_idx" ON "public"."OrderAssemblyStep"("externalProductionOrderId");

-- CreateIndex
CREATE INDEX "OrderAssemblyStep_trabajoDeArmadoId_idx" ON "public"."OrderAssemblyStep"("trabajoDeArmadoId");

-- AddForeignKey
ALTER TABLE "public"."OrderAssemblyStep" ADD CONSTRAINT "OrderAssemblyStep_externalProductionOrderId_fkey" FOREIGN KEY ("externalProductionOrderId") REFERENCES "public"."ExternalProductionOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrderAssemblyStep" ADD CONSTRAINT "OrderAssemblyStep_trabajoDeArmadoId_fkey" FOREIGN KEY ("trabajoDeArmadoId") REFERENCES "public"."TrabajoDeArmado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
