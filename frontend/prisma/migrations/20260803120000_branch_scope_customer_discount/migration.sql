-- Customer: branch ownership (Walk-in / legacy stay null)
ALTER TABLE "Customer" ADD COLUMN "branchId" TEXT;

CREATE INDEX "Customer_branchId_idx" ON "Customer"("branchId");

ALTER TABLE "Customer" ADD CONSTRAINT "Customer_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

DROP INDEX IF EXISTS "Customer_phone_key";

CREATE UNIQUE INDEX "Customer_branchId_phone_key" ON "Customer"("branchId", "phone");

-- DiscountLabel: scope names per branch
ALTER TABLE "DiscountLabel" ADD COLUMN "branchId" TEXT;

-- Point existing labels at the oldest branch; drop any left unscoped (no branches)
UPDATE "DiscountLabel" d
SET "branchId" = (SELECT b."id" FROM "Branch" b ORDER BY b."createdAt" ASC LIMIT 1)
WHERE d."branchId" IS NULL;

DELETE FROM "DiscountLabel" WHERE "branchId" IS NULL;

ALTER TABLE "DiscountLabel" ALTER COLUMN "branchId" SET NOT NULL;

DROP INDEX IF EXISTS "DiscountLabel_name_key";

CREATE UNIQUE INDEX "DiscountLabel_branchId_name_key" ON "DiscountLabel"("branchId", "name");

CREATE INDEX "DiscountLabel_branchId_idx" ON "DiscountLabel"("branchId");

ALTER TABLE "DiscountLabel" ADD CONSTRAINT "DiscountLabel_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
