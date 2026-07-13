-- Per-branch inventory: stock lives on BranchMaterial, not Material.

CREATE TABLE "BranchMaterial" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "stock" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "BranchMaterial_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BranchMaterial_branchId_materialId_key" ON "BranchMaterial"("branchId", "materialId");
CREATE INDEX "BranchMaterial_branchId_idx" ON "BranchMaterial"("branchId");
CREATE INDEX "BranchMaterial_materialId_idx" ON "BranchMaterial"("materialId");

ALTER TABLE "BranchMaterial" ADD CONSTRAINT "BranchMaterial_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BranchMaterial" ADD CONSTRAINT "BranchMaterial_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Copy existing global stock to every branch.
INSERT INTO "BranchMaterial" ("id", "branchId", "materialId", "stock")
SELECT gen_random_uuid()::text, b."id", m."id", m."stock"
FROM "Branch" b
CROSS JOIN "Material" m;

ALTER TABLE "InventoryMovement" ADD COLUMN "branchId" TEXT;
CREATE INDEX "InventoryMovement_branchId_idx" ON "InventoryMovement"("branchId");
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Material" DROP COLUMN "stock";
