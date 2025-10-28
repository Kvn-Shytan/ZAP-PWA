-- AlterTable
ALTER TABLE "public"."ExternalProductionOrder" ADD COLUMN     "assemblerPaymentId" TEXT;

-- AddForeignKey
ALTER TABLE "public"."ExternalProductionOrder" ADD CONSTRAINT "ExternalProductionOrder_assemblerPaymentId_fkey" FOREIGN KEY ("assemblerPaymentId") REFERENCES "public"."AssemblerPayment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
