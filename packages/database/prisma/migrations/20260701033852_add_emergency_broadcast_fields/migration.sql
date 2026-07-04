-- AlterTable
ALTER TABLE "ResourceRequest" ADD COLUMN     "declinedBy" TEXT[],
ADD COLUMN     "isBroadcast" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isEmergency" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "maxRadiusKm" INTEGER DEFAULT 50;
