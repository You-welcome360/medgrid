import { writeAuditLog, AuditAction, prisma } from '@medgrid/database';
import {
  createNotFoundError,
  createAuthorizationError,
  createConflictError,
  createValidationError,
  FACILITY_RESOURCE_ACCESS,
  type CreateInventoryBatchDTO,
  type CreateStockMovementDTO,
  type InventoryItemDTO,
  type LowStockAlertDTO,
  type SetThresholdDTO,
  type StockMovementDTO,
  type UpdateInventoryStatusDTO,
  InventoryStatus,
  ResourceType,
  StockMovementType,
} from '@medgrid/shared';

import {
  createInventoryItem,
  findInventoryById,
  findInventoryByName,
  findInventoryByFacility,
  findAvailableInventoryForFacility,
  updateInventoryStatus,
  softDeleteInventory,
  setInventoryThreshold,
  setReservedThreshold,
  createStockMovement,
  findStockMovementsByInventory,
  deriveCurrentQuantity,
  findActiveAlertByInventory,
  createLowStockAlert,
  resolveAlert,
  findActiveAlertsByFacility,
  findAlertsByInventory,
  findNetworkResources,
  findFacilitiesByResource,
} from './inventory.repository';

// ===========================================================================
// Mappers
// ===========================================================================

const toInventoryItemDTO = async (
  item: Awaited<ReturnType<typeof findInventoryById>>
): Promise<InventoryItemDTO> => {
  if (!item) {
    throw createNotFoundError('Inventory item not found');
  }

  const quantity = await deriveCurrentQuantity(item.id);

  return {
    id: item.id,
    facilityId: item.facilityId,
    resourceType: item.resourceType as unknown as ResourceType,
    itemName: item.itemName,
    quantity,
    unit: item.unit as unknown as InventoryItemDTO['unit'],
    status: item.status as unknown as InventoryStatus,
    lowStockThreshold: item.lowStockThreshold,
    metadata: item.metadata as InventoryItemDTO['metadata'],
    price: item.price ? item.price.toNumber() : undefined,
    isMovable: item.isMovable,
    createdById: item.createdById,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };

};

const toStockMovementDTO = (
  movement: Awaited<ReturnType<typeof findStockMovementsByInventory>>[number]
): StockMovementDTO => ({
  id: movement.id,
  inventoryId: movement.inventoryId,
  facilityId: movement.facilityId,
  quantity: movement.quantity,
  movementType: movement.movementType as unknown as StockMovementType,
  reason: movement.reason,
  performedById: movement.performedById,
  referenceId: movement.referenceId,
  createdAt: movement.createdAt.toISOString(),
});

// ===========================================================================
// Alert helpers
// ===========================================================================

type AlertWithInventory = Awaited<
  ReturnType<typeof findActiveAlertsByFacility>
>[number];

const toAlertDTO = (alert: AlertWithInventory): LowStockAlertDTO => ({
  id: alert.id,
  inventoryId: alert.inventoryId,
  facilityId: alert.facilityId,
  itemName: alert.inventory.itemName,
  resourceType: alert.inventory.resourceType,
  thresholdAtTime: alert.thresholdAtTime,
  quantityAtTime: alert.quantityAtTime,
  resolvedAt: alert.resolvedAt?.toISOString() ?? null,
  createdAt: alert.createdAt.toISOString(),
});

const checkAndUpdateAlertState = async (
  inventoryId: string,
  facilityId: string,
  currentQuantity: number,
  threshold: number | null
): Promise<void> => {
  if (threshold === null) return;

  const activeAlert = await findActiveAlertByInventory(inventoryId);

  if (currentQuantity <= threshold) {
    // Fire a new alert only if one isn't already active
    if (!activeAlert) {
      await createLowStockAlert(
        inventoryId,
        facilityId,
        threshold,
        currentQuantity
      );
    }
  } else {
    // Resolve the active alert if stock recovered
    if (activeAlert) {
      await resolveAlert(activeAlert.id);
    }
  }
};

// ===========================================================================
// Inventory CRUD
// ===========================================================================

export const createInventory = async (
  data: CreateInventoryBatchDTO,
  facilityId: string,
  performedById: string
): Promise<InventoryItemDTO> => {
  const existing = await findInventoryByName(
    facilityId,
    data.resourceType as unknown as ResourceType,
    data.itemName
  );

  if (existing) {
    throw createConflictError(
      `An inventory item named "${data.itemName}" of type ${data.resourceType} already exists for this facility`
    );
  }

  const facility = await prisma.facility.findUnique({
    where: { id: facilityId },
  });

  if (!facility) {
    throw createNotFoundError('Facility not found');
  }

  const allowedResources = FACILITY_RESOURCE_ACCESS[facility.type as keyof typeof FACILITY_RESOURCE_ACCESS];
  if (!allowedResources || !allowedResources.includes(data.resourceType as unknown as ResourceType)) {
    throw createValidationError(
      `Facility of type ${facility.type} is not authorized to manage resource type ${data.resourceType}`
    );
  }

  const item = await createInventoryItem(data, facilityId, performedById);


  await writeAuditLog({
    actorId: performedById,
    action: AuditAction.INVENTORY_CREATED,
    entityType: 'Inventory',
    entityId: item.id,
    facilityId,
    newValue: {
      resourceType: item.resourceType,
      itemName: item.itemName,
    },
  });

  return toInventoryItemDTO(item);
};

export const getInventoryByFacility = async (
  facilityId: string,
  resourceType?: ResourceType,
  status?: InventoryStatus
): Promise<InventoryItemDTO[]> => {
  const items = await findInventoryByFacility(facilityId, resourceType, status);

  return Promise.all(items.map(toInventoryItemDTO));
};

export const getInventoryItemById = async (
  id: string,
  facilityId: string
): Promise<InventoryItemDTO> => {
  const item = await findInventoryById(id);

  if (!item) {
    throw createNotFoundError('Inventory item not found');
  }

  if (item.facilityId !== facilityId) {
    throw createAuthorizationError('Access denied');
  }

  return toInventoryItemDTO(item);
};

export const setInventoryStatus = async (
  id: string,
  facilityId: string,
  data: UpdateInventoryStatusDTO,
  performedById: string
): Promise<InventoryItemDTO> => {
  const item = await findInventoryById(id);

  if (!item) {
    throw createNotFoundError('Inventory item not found');
  }

  if (item.facilityId !== facilityId) {
    throw createAuthorizationError('Access denied');
  }

  const updated = await updateInventoryStatus(
    id,
    data.status as unknown as Parameters<typeof updateInventoryStatus>[1]
  );

  await writeAuditLog({
    actorId: performedById,
    action: AuditAction.INVENTORY_UPDATED,
    entityType: 'Inventory',
    entityId: id,
    facilityId,
    previousValue: { status: item.status },
    newValue: { status: data.status },
  });

  return toInventoryItemDTO(updated);
};

export const deleteInventory = async (
  id: string,
  facilityId: string,
  performedById: string
): Promise<void> => {
  const item = await findInventoryById(id);

  if (!item) {
    throw createNotFoundError('Inventory item not found');
  }

  if (item.facilityId !== facilityId) {
    throw createAuthorizationError('Access denied');
  }

  await softDeleteInventory(id);

  await writeAuditLog({
    actorId: performedById,
    action: AuditAction.INVENTORY_DELETED,
    entityType: 'Inventory',
    entityId: id,
    facilityId,
    previousValue: {
      resourceType: item.resourceType,
      itemName: item.itemName,
      status: item.status,
    },
  });
};

// ===========================================================================
// Stock Movements
// ===========================================================================

export const recordStockMovement = async (
  inventoryId: string,
  facilityId: string,
  data: CreateStockMovementDTO,
  performedById: string
): Promise<StockMovementDTO> => {
  const item = await findInventoryById(inventoryId);

  if (!item) {
    throw createNotFoundError('Inventory item not found');
  }

  if (item.facilityId !== facilityId) {
    throw createAuthorizationError('Access denied');
  }

  const movement = await createStockMovement(
    data,
    inventoryId,
    facilityId,
    performedById
  );

  const newQuantity = await deriveCurrentQuantity(inventoryId);

  await checkAndUpdateAlertState(
    inventoryId,
    facilityId,
    newQuantity,
    item.lowStockThreshold
  );

  await writeAuditLog({
    actorId: performedById,
    action: AuditAction.INVENTORY_ADJUSTED,
    entityType: 'Inventory',
    entityId: inventoryId,
    facilityId,
    newValue: {
      movementType: data.movementType,
      quantity: data.quantity,
      currentStock: newQuantity,
      reason: data.reason ?? null,
    },
  });

  return toStockMovementDTO(movement);
};

export const getStockMovements = async (
  inventoryId: string,
  facilityId: string
): Promise<StockMovementDTO[]> => {
  const item = await findInventoryById(inventoryId);

  if (!item) {
    throw createNotFoundError('Inventory item not found');
  }

  if (item.facilityId !== facilityId) {
    throw createAuthorizationError('Access denied');
  }

  const movements = await findStockMovementsByInventory(inventoryId);

  return movements.map(toStockMovementDTO);
};

// ===========================================================================
// Threshold
// ===========================================================================

export const updateThreshold = async (
  id: string,
  facilityId: string,
  data: SetThresholdDTO,
  performedById: string
): Promise<InventoryItemDTO> => {
  const item = await findInventoryById(id);

  if (!item) {
    throw createNotFoundError('Inventory item not found');
  }

  if (item.facilityId !== facilityId) {
    throw createAuthorizationError('Access denied');
  }

  const updated = await setInventoryThreshold(id, data.threshold);

  await writeAuditLog({
    actorId: performedById,
    action: AuditAction.INVENTORY_UPDATED,
    entityType: 'Inventory',
    entityId: id,
    facilityId,
    previousValue: { lowStockThreshold: item.lowStockThreshold },
    newValue: { lowStockThreshold: data.threshold },
  });

  // Re-evaluate alert state immediately after threshold change
  const currentQuantity = await deriveCurrentQuantity(id);

  await checkAndUpdateAlertState(
    id,
    facilityId,
    currentQuantity,
    data.threshold
  );

  return toInventoryItemDTO(updated);
};

// ===========================================================================
// Low Stock Alerts
// ===========================================================================

export const getActiveAlerts = async (
  facilityId: string
): Promise<LowStockAlertDTO[]> => {
  const alerts = await findActiveAlertsByFacility(facilityId);

  return alerts.map(toAlertDTO);
};

export const getAlertsByInventoryItem = async (
  inventoryId: string,
  facilityId: string
): Promise<LowStockAlertDTO[]> => {
  const item = await findInventoryById(inventoryId);

  if (!item) {
    throw createNotFoundError('Inventory item not found');
  }

  if (item.facilityId !== facilityId) {
    throw createAuthorizationError('Access denied');
  }

  const alerts = await findAlertsByInventory(inventoryId);

  return alerts.map(toAlertDTO);
};

export const updateReservedThreshold = async (
  id: string,
  facilityId: string,
  threshold: number,
  performedById: string
): Promise<InventoryItemDTO> => {
  const item = await findInventoryById(id);

  if (!item) throw createNotFoundError('Inventory item not found');
  if (item.facilityId !== facilityId)
    throw createAuthorizationError('Access denied');

  const updated = await setReservedThreshold(id, threshold);

  await writeAuditLog({
    actorId: performedById,
    action: AuditAction.INVENTORY_UPDATED,
    entityType: 'Inventory',
    entityId: id,
    facilityId,
    previousValue: { reservedThreshold: item.reservedThreshold },
    newValue: { reservedThreshold: threshold },
  });

  return toInventoryItemDTO(updated);
};

export const getAvailableInventoryForFacility = async (
  facilityId: string,
  resourceType?: ResourceType
): Promise<InventoryItemDTO[]> => {
  const items = await findAvailableInventoryForFacility(
    facilityId,
    resourceType
  );
  return Promise.all(items.map(toInventoryItemDTO));
};

export const getNetworkResources = async () => {
  return findNetworkResources();
};

export const getResourceFacilities = async (
  resourceType: ResourceType,
  itemName?: string
) => {
  const items = await findFacilitiesByResource(resourceType, itemName);
  return Promise.all(
    items.map(async (item) => {
      const quantity = await deriveCurrentQuantity(item.id);
      return {
        id: item.id,
        facilityId: item.facilityId,
        itemName: item.itemName,
        resourceType: item.resourceType as unknown as ResourceType,
        unit: item.unit as unknown as InventoryItemDTO['unit'],
        status: item.status as unknown as InventoryStatus,
        quantity,
        price: item.price ? item.price.toNumber() : undefined,
        isMovable: item.isMovable,
        facility: item.facility,
      };
    })
  );
};

export const updateInventoryPrice = async (
  id: string,
  price: number
): Promise<InventoryItemDTO> => {
  const item = await prisma.inventory.update({
    where: { id },
    data: { price },
  });
  return toInventoryItemDTO(item);
};

export const getExpiryAlerts = async (facilityId: string) => {
  return prisma.expiryAlert.findMany({
    where: {
      facilityId,
      resolvedAt: null,
    },
    include: {
      inventory: true,
    },
    orderBy: {
      daysToExpiry: 'asc',
    },
  });
};

export const getRedistributionOffers = async () => {
  return prisma.redistributionOffer.findMany({
    where: {
      status: 'OPEN',
    },
    include: {
      inventory: {
        include: {
          facility: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
};

export const createRedistributionOffer = async (
  inventoryId: string,
  facilityId: string,
  quantity: number,
  price: number
) => {
  const inventory = await findInventoryById(inventoryId);
  if (!inventory) {
    throw createNotFoundError('Inventory item not found');
  }
  if (inventory.facilityId !== facilityId) {
    throw createAuthorizationError('Access denied');
  }

  const metadata = inventory.metadata as Record<string, any>;
  const expiryDate = metadata && metadata.expiryDate ? new Date(metadata.expiryDate) : new Date();

  // Check if there is already an open offer
  const existingOffer = await prisma.redistributionOffer.findFirst({
    where: {
      inventoryId,
      status: 'OPEN',
    },
  });

  if (existingOffer) {
    throw createValidationError('An open redistribution offer already exists for this item');
  }

  return prisma.redistributionOffer.create({
    data: {
      inventoryId,
      facilityId,
      quantity,
      unit: inventory.unit,
      price,
      status: 'OPEN',
      expiresAt: expiryDate,
    },
  });
};

export const claimRedistributionOffer = async (
  offerId: string
) => {
  const offer = await prisma.redistributionOffer.findUnique({
    where: { id: offerId },
  });

  if (!offer) {
    throw createNotFoundError('Redistribution offer not found');
  }

  if (offer.status !== 'OPEN') {
    throw createValidationError('This offer is no longer open');
  }

  return prisma.redistributionOffer.update({
    where: { id: offerId },
    data: { status: 'CLAIMED' },
    include: {
      inventory: true,
    },
  });
};

