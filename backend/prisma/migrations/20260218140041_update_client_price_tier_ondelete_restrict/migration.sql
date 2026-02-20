-- DropForeignKey
ALTER TABLE "Client" DROP CONSTRAINT "Client_priceTierId_fkey";

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_priceTierId_fkey" FOREIGN KEY ("priceTierId") REFERENCES "PriceTier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
