-- CreateEnum
CREATE TYPE "PackageMeasure" AS ENUM ('ML', 'GRAM');

-- AlterTable
ALTER TABLE "Material" ADD COLUMN     "packageAmount" DOUBLE PRECISION,
ADD COLUMN     "packageMeasure" "PackageMeasure";
