/*
  Warnings:

  - The following changes are manually authored to preserve data during refactoring.
  - The migration renames tables and columns from Spanish to English.

*/
-- Step 1: Rename Tables
ALTER TABLE "public"."Armador" RENAME TO "Assembler";
ALTER TABLE "public"."TrabajoDeArmado" RENAME TO "AssemblyJob";
ALTER TABLE "public"."ProductoTrabajoArmado" RENAME TO "ProductAssemblyJob";

-- Step 2: Rename Columns
-- Rename columns in the newly named "Assembler" table
ALTER TABLE "public"."Assembler" RENAME CONSTRAINT "Armador_pkey" TO "Assembler_pkey";
ALTER INDEX "public"."Armador_name_key" RENAME TO "Assembler_name_key";

-- Rename columns in the newly named "AssemblyJob" table
ALTER TABLE "public"."AssemblyJob" RENAME CONSTRAINT "TrabajoDeArmado_pkey" TO "AssemblyJob_pkey";
ALTER INDEX "public"."TrabajoDeArmado_nombre_key" RENAME TO "AssemblyJob_name_key";
ALTER TABLE "public"."AssemblyJob" RENAME COLUMN "nombre" TO "name";
ALTER TABLE "public"."AssemblyJob" RENAME COLUMN "precio" TO "price";
ALTER TABLE "public"."AssemblyJob" RENAME COLUMN "descripcion" TO "description";

-- Rename columns in the newly named "ProductAssemblyJob" table
ALTER TABLE "public"."ProductAssemblyJob" RENAME CONSTRAINT "ProductoTrabajoArmado_pkey" TO "ProductAssemblyJob_pkey";
ALTER INDEX "public"."ProductoTrabajoArmado_productId_key" RENAME TO "ProductAssemblyJob_productId_key";
ALTER TABLE "public"."ProductAssemblyJob" RENAME COLUMN "trabajoId" TO "assemblyJobId";

-- Rename columns in other tables that have foreign keys or relevant fields
ALTER TABLE "public"."AssemblerPayment" RENAME COLUMN "armadorId" TO "assemblerId";
ALTER TABLE "public"."ExternalProductionOrder" RENAME COLUMN "armadorId" TO "assemblerId";
ALTER TABLE "public"."OrderAssemblyStep" RENAME COLUMN "trabajoDeArmadoId" TO "assemblyJobId";
ALTER TABLE "public"."OrderAssemblyStep" RENAME COLUMN "precioUnitario" TO "unitPrice";

-- Step 3: Drop old Foreign Key Constraints
ALTER TABLE "public"."AssemblerPayment" DROP CONSTRAINT "AssemblerPayment_armadorId_fkey";
ALTER TABLE "public"."ExternalProductionOrder" DROP CONSTRAINT "ExternalProductionOrder_armadorId_fkey";
ALTER TABLE "public"."OrderAssemblyStep" DROP CONSTRAINT "OrderAssemblyStep_trabajoDeArmadoId_fkey";
ALTER TABLE "public"."ProductAssemblyJob" DROP CONSTRAINT "ProductoTrabajoArmado_productId_fkey";
ALTER TABLE "public"."ProductAssemblyJob" DROP CONSTRAINT "ProductoTrabajoArmado_trabajoId_fkey";

-- Step 4: Drop old indexes that will be recreated with new column names
DROP INDEX "public"."OrderAssemblyStep_trabajoDeArmadoId_idx";

-- Step 5: Add new Foreign Key Constraints with the new names
ALTER TABLE "public"."ProductAssemblyJob" ADD CONSTRAINT "ProductAssemblyJob_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."ProductAssemblyJob" ADD CONSTRAINT "ProductAssemblyJob_assemblyJobId_fkey" FOREIGN KEY ("assemblyJobId") REFERENCES "public"."AssemblyJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."ExternalProductionOrder" ADD CONSTRAINT "ExternalProductionOrder_assemblerId_fkey" FOREIGN KEY ("assemblerId") REFERENCES "public"."Assembler"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."OrderAssemblyStep" ADD CONSTRAINT "OrderAssemblyStep_assemblyJobId_fkey" FOREIGN KEY ("assemblyJobId") REFERENCES "public"."AssemblyJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."AssemblerPayment" ADD CONSTRAINT "AssemblerPayment_assemblerId_fkey" FOREIGN KEY ("assemblerId") REFERENCES "public"."Assembler"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 6: Create new indexes for the renamed columns
CREATE INDEX "OrderAssemblyStep_assemblyJobId_idx" ON "public"."OrderAssemblyStep"("assemblyJobId");