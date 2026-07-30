-- Multi-branch owner scoping + POS terminal activation

-- Branch.ownerId + optional address default
ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "ownerId" TEXT;
ALTER TABLE "Branch" ALTER COLUMN "address" SET DEFAULT '';

-- Backfill ownerId from the first OwnerAccount (single-owner demos / existing DBs)
UPDATE "Branch"
SET "ownerId" = (SELECT "id" FROM "OwnerAccount" ORDER BY "createdAt" ASC LIMIT 1)
WHERE "ownerId" IS NULL
  AND EXISTS (SELECT 1 FROM "OwnerAccount");

CREATE INDEX IF NOT EXISTS "Branch_ownerId_idx" ON "Branch"("ownerId");

ALTER TABLE "Branch" DROP CONSTRAINT IF EXISTS "Branch_ownerId_fkey";
ALTER TABLE "Branch"
  ADD CONSTRAINT "Branch_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "OwnerAccount"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Service: allow same name per branch (drop global unique on name)
ALTER TABLE "Service" DROP CONSTRAINT IF EXISTS "Service_name_key";
DROP INDEX IF EXISTS "Service_name_key";
CREATE UNIQUE INDEX IF NOT EXISTS "Service_branchId_name_key" ON "Service"("branchId", "name");

-- Terminal
CREATE TABLE IF NOT EXISTS "Terminal" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'POS Terminal',
    "activatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Terminal_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Terminal_branchId_idx" ON "Terminal"("branchId");
CREATE INDEX IF NOT EXISTS "Terminal_branchId_revokedAt_idx" ON "Terminal"("branchId", "revokedAt");

ALTER TABLE "Terminal" DROP CONSTRAINT IF EXISTS "Terminal_branchId_fkey";
ALTER TABLE "Terminal"
  ADD CONSTRAINT "Terminal_branchId_fkey"
  FOREIGN KEY ("branchId") REFERENCES "Branch"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- BranchActivationCode
CREATE TABLE IF NOT EXISTS "BranchActivationCode" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "usedAt" TIMESTAMP(3),
    "terminalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BranchActivationCode_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "BranchActivationCode_terminalId_key" ON "BranchActivationCode"("terminalId");
CREATE INDEX IF NOT EXISTS "BranchActivationCode_branchId_idx" ON "BranchActivationCode"("branchId");
CREATE INDEX IF NOT EXISTS "BranchActivationCode_tokenHash_idx" ON "BranchActivationCode"("tokenHash");

ALTER TABLE "BranchActivationCode" DROP CONSTRAINT IF EXISTS "BranchActivationCode_branchId_fkey";
ALTER TABLE "BranchActivationCode"
  ADD CONSTRAINT "BranchActivationCode_branchId_fkey"
  FOREIGN KEY ("branchId") REFERENCES "Branch"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BranchActivationCode" DROP CONSTRAINT IF EXISTS "BranchActivationCode_terminalId_fkey";
ALTER TABLE "BranchActivationCode"
  ADD CONSTRAINT "BranchActivationCode_terminalId_fkey"
  FOREIGN KEY ("terminalId") REFERENCES "Terminal"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
