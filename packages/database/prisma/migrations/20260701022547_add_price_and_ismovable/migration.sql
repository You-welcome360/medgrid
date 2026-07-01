-- AlterTable
ALTER TABLE "Inventory" ADD COLUMN     "isMovable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "price" DECIMAL(10,2);
