-- Convert Service.category from enum to TEXT without dropping the column (preserves values).
-- No-op if the column is already a text type (e.g. after a prior manual fix).

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Service'
      AND column_name = 'category'
      AND udt_name = 'ServiceCategory'
  ) THEN
    ALTER TABLE "Service" ALTER COLUMN "category" DROP DEFAULT;
    ALTER TABLE "Service" ALTER COLUMN "category" TYPE TEXT USING ("category"::text);
    ALTER TABLE "Service" ALTER COLUMN "category" SET DEFAULT 'Others';
    DROP TYPE IF EXISTS "ServiceCategory";
  END IF;
END $$;
