/*
  Warnings:

  - You are about to drop the column `notes` on the `ExternalProductionOrder` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."ExternalProductionOrder" DROP COLUMN "notes";

-- CreateTable
CREATE TABLE "public"."OrderNote" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "authorId" INTEGER NOT NULL,
    "externalProductionOrderId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderNote_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."OrderNote" ADD CONSTRAINT "OrderNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrderNote" ADD CONSTRAINT "OrderNote_externalProductionOrderId_fkey" FOREIGN KEY ("externalProductionOrderId") REFERENCES "public"."ExternalProductionOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
