-- AlterTable
ALTER TABLE "SaleMaterial" ADD COLUMN     "saleServiceId" TEXT;

-- CreateIndex
CREATE INDEX "SaleMaterial_saleServiceId_idx" ON "SaleMaterial"("saleServiceId");

-- AddForeignKey
ALTER TABLE "SaleMaterial" ADD CONSTRAINT "SaleMaterial_saleServiceId_fkey" FOREIGN KEY ("saleServiceId") REFERENCES "SaleService"("id") ON DELETE SET NULL ON UPDATE CASCADE;
