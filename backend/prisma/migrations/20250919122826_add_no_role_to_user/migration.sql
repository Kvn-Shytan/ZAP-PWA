-- AlterEnum
ALTER TYPE "public"."Role" ADD VALUE 'NO_ROLE';

-- AlterTable
ALTER TABLE "public"."User" ALTER COLUMN "role" SET DEFAULT 'NO_ROLE';
