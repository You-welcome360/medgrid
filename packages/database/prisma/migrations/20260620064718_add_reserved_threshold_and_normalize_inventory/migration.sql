-- CreateEnum
CREATE TYPE "ResourceType" AS ENUM ('BLOOD', 'PPE', 'MEDICATION', 'MEDICAL_EQUIPMENT');

-- CreateEnum
CREATE TYPE "InventoryUnit" AS ENUM ('UNITS', 'TABLETS', 'CAPSULES', 'VIALS', 'BOXES', 'PACKS', 'PIECES', 'BOTTLES');

-- CreateEnum
CREATE TYPE "InventoryStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'UNAVAILABLE', 'MAINTENANCE', 'EXPIRED', 'DEPLETED');

-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('RESTOCK', 'CONSUMPTION', 'ADJUSTMENT', 'EXPIRED_REMOVAL', 'DAMAGE', 'TRANSFER_OUT', 'TRANSFER_IN');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED', 'REJECTED', 'FAILED');

-- CreateEnum
CREATE TYPE "RequestPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('LOGIN', 'LOGOUT', 'LOGIN_FAILED', 'PASSWORD_CHANGED', 'ACCOUNT_LOCKED', 'ONBOARDING_REQUEST_SUBMITTED', 'ONBOARDING_REQUEST_APPROVED', 'ONBOARDING_REQUEST_REJECTED', 'FACILITY_CREATED', 'FACILITY_UPDATED', 'FACILITY_SUSPENDED', 'USER_CREATED', 'USER_SUSPENDED', 'USER_DEACTIVATED', 'USER_ROLE_CHANGED', 'INVENTORY_CREATED', 'INVENTORY_UPDATED', 'INVENTORY_ADJUSTED', 'INVENTORY_DELETED', 'REQUEST_CREATED', 'REQUEST_ACCEPTED', 'REQUEST_REJECTED', 'REQUEST_COMPLETED', 'REQUEST_CANCELLED');

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "actorRole" TEXT,
    "action" "AuditAction" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "facilityId" TEXT,
    "previousValue" JSONB,
    "newValue" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inventory" (
    "id" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "resourceType" "ResourceType" NOT NULL,
    "itemName" VARCHAR(255) NOT NULL,
    "unit" "InventoryUnit" NOT NULL,
    "status" "InventoryStatus" NOT NULL DEFAULT 'AVAILABLE',
    "lowStockThreshold" INTEGER,
    "reservedThreshold" INTEGER,
    "metadata" JSONB NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "inventoryId" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "movementType" "StockMovementType" NOT NULL,
    "reason" VARCHAR(500),
    "performedById" TEXT NOT NULL,
    "referenceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LowStockAlert" (
    "id" TEXT NOT NULL,
    "inventoryId" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "thresholdAtTime" INTEGER NOT NULL,
    "quantityAtTime" INTEGER NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LowStockAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResourceRequest" (
    "id" TEXT NOT NULL,
    "requestingFacilityId" TEXT NOT NULL,
    "supplyingFacilityId" TEXT,
    "requestedById" TEXT NOT NULL,
    "handledById" TEXT,
    "resourceType" "ResourceType" NOT NULL,
    "itemName" VARCHAR(255) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit" "InventoryUnit" NOT NULL,
    "priority" "RequestPriority" NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "description" VARCHAR(1000) NOT NULL,
    "patient" JSONB,
    "rejectionReason" VARCHAR(500),
    "cancellationReason" VARCHAR(500),
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "dispatchedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResourceRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserInvitation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_facilityId_idx" ON "AuditLog"("facilityId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "Inventory_facilityId_idx" ON "Inventory"("facilityId");

-- CreateIndex
CREATE INDEX "Inventory_resourceType_idx" ON "Inventory"("resourceType");

-- CreateIndex
CREATE INDEX "Inventory_status_idx" ON "Inventory"("status");

-- CreateIndex
CREATE INDEX "Inventory_facilityId_resourceType_idx" ON "Inventory"("facilityId", "resourceType");

-- CreateIndex
CREATE INDEX "Inventory_facilityId_status_idx" ON "Inventory"("facilityId", "status");

-- CreateIndex
CREATE INDEX "StockMovement_inventoryId_idx" ON "StockMovement"("inventoryId");

-- CreateIndex
CREATE INDEX "StockMovement_facilityId_idx" ON "StockMovement"("facilityId");

-- CreateIndex
CREATE INDEX "StockMovement_movementType_idx" ON "StockMovement"("movementType");

-- CreateIndex
CREATE INDEX "StockMovement_performedById_idx" ON "StockMovement"("performedById");

-- CreateIndex
CREATE INDEX "StockMovement_inventoryId_createdAt_idx" ON "StockMovement"("inventoryId", "createdAt");

-- CreateIndex
CREATE INDEX "LowStockAlert_inventoryId_idx" ON "LowStockAlert"("inventoryId");

-- CreateIndex
CREATE INDEX "LowStockAlert_facilityId_idx" ON "LowStockAlert"("facilityId");

-- CreateIndex
CREATE INDEX "LowStockAlert_facilityId_resolvedAt_idx" ON "LowStockAlert"("facilityId", "resolvedAt");

-- CreateIndex
CREATE INDEX "LowStockAlert_inventoryId_resolvedAt_idx" ON "LowStockAlert"("inventoryId", "resolvedAt");

-- CreateIndex
CREATE INDEX "ResourceRequest_requestingFacilityId_idx" ON "ResourceRequest"("requestingFacilityId");

-- CreateIndex
CREATE INDEX "ResourceRequest_supplyingFacilityId_idx" ON "ResourceRequest"("supplyingFacilityId");

-- CreateIndex
CREATE INDEX "ResourceRequest_status_idx" ON "ResourceRequest"("status");

-- CreateIndex
CREATE INDEX "ResourceRequest_priority_idx" ON "ResourceRequest"("priority");

-- CreateIndex
CREATE INDEX "ResourceRequest_resourceType_idx" ON "ResourceRequest"("resourceType");

-- CreateIndex
CREATE INDEX "ResourceRequest_requestedById_idx" ON "ResourceRequest"("requestedById");

-- CreateIndex
CREATE INDEX "ResourceRequest_requestingFacilityId_status_idx" ON "ResourceRequest"("requestingFacilityId", "status");

-- CreateIndex
CREATE INDEX "ResourceRequest_supplyingFacilityId_status_idx" ON "ResourceRequest"("supplyingFacilityId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "UserInvitation_userId_key" ON "UserInvitation"("userId");

-- CreateIndex
CREATE INDEX "UserInvitation_userId_idx" ON "UserInvitation"("userId");

-- CreateIndex
CREATE INDEX "UserInvitation_facilityId_idx" ON "UserInvitation"("facilityId");

-- AddForeignKey
ALTER TABLE "Inventory" ADD CONSTRAINT "Inventory_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "Inventory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LowStockAlert" ADD CONSTRAINT "LowStockAlert_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "Inventory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceRequest" ADD CONSTRAINT "ResourceRequest_requestingFacilityId_fkey" FOREIGN KEY ("requestingFacilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceRequest" ADD CONSTRAINT "ResourceRequest_supplyingFacilityId_fkey" FOREIGN KEY ("supplyingFacilityId") REFERENCES "Facility"("id") ON DELETE SET NULL ON UPDATE CASCADE;
