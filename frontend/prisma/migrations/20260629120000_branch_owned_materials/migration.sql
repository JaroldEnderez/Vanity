-- AlterTable
ALTER TABLE "Material"
ADD COLUMN "branchId" TEXT;

-- Drop legacy global SKU uniqueness so branch-local materials can use branch-scoped SKU uniqueness.
ALTER TABLE "Material"
DROP CONSTRAINT IF EXISTS "Material_sku_key";

-- Add branch relation and branch+sku uniqueness.
ALTER TABLE "Material"
ADD CONSTRAINT "Material_branchId_fkey"
FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "Material_branchId_idx" ON "Material"("branchId");

CREATE UNIQUE INDEX "Material_branchId_sku_key" ON "Material"("branchId", "sku");
