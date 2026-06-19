import { prisma } from '@medgrid/database';
import {
  InventoryStatus,
  InventoryUnit,
  ResourceType,
  StockMovementType,
} from '@medgrid/database';
import { Prisma } from '@medgrid/database/src/generated/prisma/client';

import type {
  CreateInventoryBatchDTO,
  CreateStockMovementDTO,
} from '@medgrid/shared';

// ===========================================================================
// Inventory
// ===========================================================================

export const createInventoryItem = async (
  data: CreateInventoryBatchDTO,
  facilityId: string,
  createdById: string
) => {
  return prisma.inventory.create({
    data: {
      facilityId,
      resourceType: data.resourceType as ResourceType,
      itemName: data.itemName,
      unit: data.unit as InventoryUnit,
      status: InventoryStatus.AVAILABLE,
      metadata: data.metadata as Prisma.InputJsonValue,
      createdById,
    },
  });
};

export const findInventoryById = async (id: string) => {
  return prisma.inventory.findUnique({
    where: { id, deletedAt: null },
  });
};

export const findInventoryByName = async (
  facilityId: string,
  resourceType: ResourceType,
  itemName: string
) => {
  return prisma.inventory.findFirst({
    where: {
      facilityId,
      resourceType,
      itemName,
      deletedAt: null,
    },
  });
};

export const findInventoryByFacility = async (
  facilityId: string,
  resourceType?: ResourceType,
  status?: InventoryStatus
) => {
  return prisma.inventory.findMany({
    where: {
      facilityId,
      deletedAt: null,
      ...(resourceType ? { resourceType } : {}),
      ...(status ? { status } : {}),
    },
    orderBy: { createdAt: 'desc' },
  });
};

export const updateInventoryStatus = async (
  id: string,
  status: InventoryStatus
) => {
  return prisma.inventory.update({
    where: { id },
    data: { status },
  });
};

export const softDeleteInventory = async (id: string) => {
  return prisma.inventory.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
};

// ===========================================================================
// Stock Movements
// ===========================================================================

export const createStockMovement = async (
  data: CreateStockMovementDTO,
  inventoryId: string,
  facilityId: string,
  performedById: string
) => {
  return prisma.stockMovement.create({
    data: {
      inventoryId,
      facilityId,
      quantity: data.quantity,
      movementType: data.movementType as StockMovementType,
      reason: data.reason,
      referenceId: data.referenceId,
      performedById,
    },
  });
};

export const findStockMovementsByInventory = async (inventoryId: string) => {
  return prisma.stockMovement.findMany({
    where: { inventoryId },
    orderBy: { createdAt: 'desc' },
  });
};

export const deriveCurrentQuantity = async (
  inventoryId: string
): Promise<number> => {
  const result = await prisma.stockMovement.aggregate({
    where: { inventoryId },
    _sum: { quantity: true },
  });

  return result._sum.quantity ?? 0;
};

// ===========================================================================
// Threshold
// ===========================================================================

export const setInventoryThreshold = async (id: string, threshold: number) => {
  return prisma.inventory.update({
    where: { id },
    data: { lowStockThreshold: threshold },
  });
};

// ===========================================================================
// Low Stock Alerts
// ===========================================================================

export const findActiveAlertByInventory = async (inventoryId: string) => {
  return prisma.lowStockAlert.findFirst({
    where: { inventoryId, resolvedAt: null },
  });
};

export const createLowStockAlert = async (
  inventoryId: string,
  facilityId: string,
  thresholdAtTime: number,
  quantityAtTime: number
) => {
  return prisma.lowStockAlert.create({
    data: {
      inventoryId,
      facilityId,
      thresholdAtTime,
      quantityAtTime,
    },
  });
};

export const resolveAlert = async (id: string) => {
  return prisma.lowStockAlert.update({
    where: { id },
    data: { resolvedAt: new Date() },
  });
};

export const findActiveAlertsByFacility = async (facilityId: string) => {
  return prisma.lowStockAlert.findMany({
    where: { facilityId, resolvedAt: null },
    include: { inventory: { select: { itemName: true, resourceType: true } } },
    orderBy: { createdAt: 'desc' },
  });
};

export const findAlertsByInventory = async (inventoryId: string) => {
  return prisma.lowStockAlert.findMany({
    where: { inventoryId },
    include: { inventory: { select: { itemName: true, resourceType: true } } },
    orderBy: { createdAt: 'desc' },
  });
};
