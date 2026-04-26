-- AlterTable
ALTER TABLE "Material" ADD COLUMN "sku" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Material_sku_key" ON "Material"("sku");
