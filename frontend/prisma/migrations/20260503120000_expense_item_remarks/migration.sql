-- Expense: category + description -> item + remarks

ALTER TABLE "Expense" ADD COLUMN "item" TEXT;

UPDATE "Expense" SET "item" = CASE "category"::text
  WHEN 'WATER' THEN 'Water'
  WHEN 'PRODUCTS' THEN 'Products'
  WHEN 'DELIVERY' THEN 'Delivery'
  WHEN 'MISC' THEN 'Misc'
  ELSE COALESCE("category"::text, 'Expense')
END;

ALTER TABLE "Expense" ALTER COLUMN "item" SET NOT NULL;

ALTER TABLE "Expense" DROP COLUMN "category";

ALTER TABLE "Expense" RENAME COLUMN "description" TO "remarks";

DROP TYPE "ExpenseCategory";
