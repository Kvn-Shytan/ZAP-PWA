-- CreateEnum
CREATE TYPE "public"."PaymentTerms" AS ENUM ('BI_WEEKLY', 'MONTHLY', 'PER_UNIT');

-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('ADMIN', 'SUPERVISOR', 'EMPLOYEE');

-- CreateEnum
CREATE TYPE "public"."ProductType" AS ENUM ('RAW_MATERIAL', 'PRE_ASSEMBLED', 'FINISHED');

-- CreateEnum
CREATE TYPE "public"."MovementType" AS ENUM ('PURCHASE', 'PRODUCTION_IN', 'CUSTOMER_RETURN', 'ADJUSTMENT_IN', 'SENT_TO_ASSEMBLER', 'RECEIVED_FROM_ASSEMBLER', 'PRODUCTION_OUT', 'SALE', 'WASTAGE', 'ADJUSTMENT_OUT');

-- CreateEnum
CREATE TYPE "public"."ExternalProductionOrderStatus" AS ENUM ('PENDING_DELIVERY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'DELIVERY_FAILED', 'RETURNED', 'PARTIALLY_RECEIVED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."QualityStatus" AS ENUM ('OK', 'DEFECTIVE', 'PARTIAL_OK');

-- CreateEnum
CREATE TYPE "public"."OverheadType" AS ENUM ('MACHINE_HOUR', 'SERVICE', 'DESIGN', 'OTHER');

-- CreateTable
CREATE TABLE "public"."Product" (
    "id" TEXT NOT NULL,
    "internalCode" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "priceUSD" DOUBLE PRECISION,
    "priceARS" DOUBLE PRECISION,
    "stock" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lowStockThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isClassified" BOOLEAN NOT NULL DEFAULT false,
    "type" "public"."ProductType" NOT NULL DEFAULT 'RAW_MATERIAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "categoryId" INTEGER,
    "supplierId" INTEGER,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProductComponent" (
    "productId" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "ProductComponent_pkey" PRIMARY KEY ("productId","componentId")
);

-- CreateTable
CREATE TABLE "public"."Category" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Supplier" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "contactInfo" TEXT,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OverheadCost" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "cost" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "type" "public"."OverheadType" NOT NULL DEFAULT 'OTHER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OverheadCost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProductOverhead" (
    "productId" TEXT NOT NULL,
    "overheadCostId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "ProductOverhead_pkey" PRIMARY KEY ("productId","overheadCostId")
);

-- CreateTable
CREATE TABLE "public"."TrabajoDeArmado" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "precio" DOUBLE PRECISION NOT NULL,
    "descripcion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "productoId" TEXT NOT NULL,

    CONSTRAINT "TrabajoDeArmado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ExternalProductionOrder" (
    "id" TEXT NOT NULL,
    "armadorId" TEXT NOT NULL,
    "dateSent" TIMESTAMP(3) NOT NULL,
    "expectedCompletionDate" TIMESTAMP(3),
    "status" "public"."ExternalProductionOrderStatus" NOT NULL DEFAULT 'PENDING_DELIVERY',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deliveryUserId" INTEGER,

    CONSTRAINT "ExternalProductionOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ExternalProductionOrderItem" (
    "id" TEXT NOT NULL,
    "externalProductionOrderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantitySent" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "ExternalProductionOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ReceivedProduction" (
    "id" TEXT NOT NULL,
    "externalProductionOrderId" TEXT NOT NULL,
    "dateReceived" TIMESTAMP(3) NOT NULL,
    "productId" TEXT NOT NULL,
    "quantityReceived" DOUBLE PRECISION NOT NULL,
    "qualityStatus" "public"."QualityStatus" NOT NULL DEFAULT 'OK',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReceivedProduction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AssemblerPayment" (
    "id" TEXT NOT NULL,
    "armadorId" TEXT NOT NULL,
    "datePaid" TIMESTAMP(3) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssemblerPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Armador" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactInfo" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "paymentTerms" "public"."PaymentTerms" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Armador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "password" TEXT NOT NULL,
    "role" "public"."Role" NOT NULL DEFAULT 'EMPLOYEE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."InventoryMovement" (
    "id" SERIAL NOT NULL,
    "productId" TEXT NOT NULL,
    "type" "public"."MovementType" NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "userId" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eventId" TEXT,

    CONSTRAINT "InventoryMovement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Product_internalCode_key" ON "public"."Product"("internalCode");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "public"."Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_name_key" ON "public"."Supplier"("name");

-- CreateIndex
CREATE UNIQUE INDEX "OverheadCost_name_key" ON "public"."OverheadCost"("name");

-- CreateIndex
CREATE UNIQUE INDEX "TrabajoDeArmado_nombre_key" ON "public"."TrabajoDeArmado"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "TrabajoDeArmado_productoId_key" ON "public"."TrabajoDeArmado"("productoId");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalProductionOrderItem_externalProductionOrderId_produ_key" ON "public"."ExternalProductionOrderItem"("externalProductionOrderId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "Armador_name_key" ON "public"."Armador"("name");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE INDEX "InventoryMovement_eventId_idx" ON "public"."InventoryMovement"("eventId");

-- AddForeignKey
ALTER TABLE "public"."Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Product" ADD CONSTRAINT "Product_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "public"."Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProductComponent" ADD CONSTRAINT "ProductComponent_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProductComponent" ADD CONSTRAINT "ProductComponent_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "public"."Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProductOverhead" ADD CONSTRAINT "ProductOverhead_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProductOverhead" ADD CONSTRAINT "ProductOverhead_overheadCostId_fkey" FOREIGN KEY ("overheadCostId") REFERENCES "public"."OverheadCost"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TrabajoDeArmado" ADD CONSTRAINT "TrabajoDeArmado_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "public"."Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExternalProductionOrder" ADD CONSTRAINT "ExternalProductionOrder_deliveryUserId_fkey" FOREIGN KEY ("deliveryUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExternalProductionOrder" ADD CONSTRAINT "ExternalProductionOrder_armadorId_fkey" FOREIGN KEY ("armadorId") REFERENCES "public"."Armador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExternalProductionOrderItem" ADD CONSTRAINT "ExternalProductionOrderItem_externalProductionOrderId_fkey" FOREIGN KEY ("externalProductionOrderId") REFERENCES "public"."ExternalProductionOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExternalProductionOrderItem" ADD CONSTRAINT "ExternalProductionOrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ReceivedProduction" ADD CONSTRAINT "ReceivedProduction_externalProductionOrderId_fkey" FOREIGN KEY ("externalProductionOrderId") REFERENCES "public"."ExternalProductionOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ReceivedProduction" ADD CONSTRAINT "ReceivedProduction_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AssemblerPayment" ADD CONSTRAINT "AssemblerPayment_armadorId_fkey" FOREIGN KEY ("armadorId") REFERENCES "public"."Armador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InventoryMovement" ADD CONSTRAINT "InventoryMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InventoryMovement" ADD CONSTRAINT "InventoryMovement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
