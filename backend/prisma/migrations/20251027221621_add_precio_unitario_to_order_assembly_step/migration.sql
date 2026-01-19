/*
  Warnings:

  - Added the required column `precioUnitario` to the `OrderAssemblyStep` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."OrderAssemblyStep" ADD COLUMN     "precioUnitario" DECIMAL(65,30) NOT NULL;
