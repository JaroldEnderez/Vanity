-- Service categories as enum + hairColoringFlow for POS hair coloring UI.

CREATE TYPE "ServiceCategory" AS ENUM ('HAIR', 'NAILS', 'SPA', 'MASSAGE', 'LASHES', 'AESTHETICS');

ALTER TABLE "Service" ADD COLUMN "hairColoringFlow" BOOLEAN NOT NULL DEFAULT false;

UPDATE "Service" SET "hairColoringFlow" = true WHERE "category" = 'Hair_coloring';

ALTER TABLE "Service" ADD COLUMN "category_new" "ServiceCategory";

UPDATE "Service" SET "category_new" = CASE
  WHEN "name" IN ('Manicure', 'Pedicure', 'Gel Nails') THEN 'NAILS'::"ServiceCategory"
  WHEN "name" = 'Hair Spa' THEN 'SPA'::"ServiceCategory"
  ELSE 'HAIR'::"ServiceCategory"
END;

ALTER TABLE "Service" DROP COLUMN "category";

ALTER TABLE "Service" RENAME COLUMN "category_new" TO "category";

ALTER TABLE "Service" ALTER COLUMN "category" SET NOT NULL;
ALTER TABLE "Service" ALTER COLUMN "category" SET DEFAULT 'HAIR'::"ServiceCategory";
