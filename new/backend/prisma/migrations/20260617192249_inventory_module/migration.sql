/*
  Warnings:

  - Changed the type of `type` on the `Facility` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "FacilityType" AS ENUM ('HOSPITAL', 'BLOOD_BANK', 'PHARMACY', 'SUPPLIER');

-- CreateEnum
CREATE TYPE "ResourceType" AS ENUM ('BLOOD', 'DRUG', 'ICU_BED', 'VENTILATOR', 'OXYGEN_CYLINDER', 'OPERATING_THEATRE', 'OTHER_SUPPLY');

-- CreateEnum
CREATE TYPE "BloodGroup" AS ENUM ('A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'AB_POS', 'AB_NEG', 'O_POS', 'O_NEG');

-- AlterTable
ALTER TABLE "Facility" DROP COLUMN "type",
ADD COLUMN     "type" "FacilityType" NOT NULL;

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "resourceType" "ResourceType" NOT NULL,
    "name" TEXT,
    "bloodGroup" "BloodGroup",
    "quantity" INTEGER,
    "total" INTEGER,
    "available" INTEGER,
    "price" DECIMAL(10,2),
    "expiryDate" TIMESTAMP(3),
    "category" TEXT,
    "unitMeasure" TEXT,
    "isMovable" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryAudit" (
    "id" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "changedBy" TEXT NOT NULL,
    "previousValue" JSONB,
    "newValue" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InventoryItem_facilityId_idx" ON "InventoryItem"("facilityId");

-- CreateIndex
CREATE INDEX "InventoryItem_resourceType_idx" ON "InventoryItem"("resourceType");

-- CreateIndex
CREATE INDEX "InventoryItem_expiryDate_idx" ON "InventoryItem"("expiryDate");

-- CreateIndex
CREATE INDEX "InventoryAudit_inventoryItemId_idx" ON "InventoryAudit"("inventoryItemId");

-- CreateIndex
CREATE INDEX "InventoryAudit_changedBy_idx" ON "InventoryAudit"("changedBy");

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryAudit" ADD CONSTRAINT "InventoryAudit_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
