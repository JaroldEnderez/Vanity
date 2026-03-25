-- Only two service categories: Hair_coloring (opens coloring modal on sale) and default.
-- Normalize legacy values from the previous multi-category setup.

UPDATE "Service" SET category = 'Hair_coloring'
WHERE category IN ('Hair_Coloring', 'Hair_coloring');

UPDATE "Service" SET category = 'default'
WHERE category IS DISTINCT FROM 'Hair_coloring';

ALTER TABLE "Service" ALTER COLUMN "category" SET DEFAULT 'default';
