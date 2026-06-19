import { writeAuditLog, AuditAction } from '@medgrid/database';
import {
  createNotFoundError,
  createAuthorizationError,
  createConflictError,
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
  updateInventoryStatus,
  softDeleteInventory,
  setInventoryThreshold,
  createStockMovement,
  findStockMovementsByInventory,
  deriveCurrentQuantity,
  findActiveAlertByInventory,
  createLowStockAlert,
  resolveAlert,
  findActiveAlertsByFacility,
  findAlertsByInventory,
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
