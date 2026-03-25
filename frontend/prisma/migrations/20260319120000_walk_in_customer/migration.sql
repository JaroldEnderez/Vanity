-- System default customer for walk-in / unnamed POS sales
INSERT INTO "Customer" ("id", "name", "createdAt")
VALUES (
  'a0000000-0000-4000-8000-000000000001',
  'Walk-in',
  NOW()
)
ON CONFLICT ("id") DO UPDATE SET "name" = EXCLUDED."name";
