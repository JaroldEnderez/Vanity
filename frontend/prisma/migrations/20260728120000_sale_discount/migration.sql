-- AlterTable
ALTER TABLE "Sale" ADD COLUMN "discountPercent" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Sale" ADD COLUMN "discountLabel" TEXT;
ALTER TABLE "Sale" ADD COLUMN "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "DiscountLabel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiscountLabel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DiscountLabel_name_key" ON "DiscountLabel"("name");
