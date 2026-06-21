import { env } from '../config/env';

const base = () => `${env.FACILITY_SERVICE_URL}/internal`;

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message: string;
}

export interface InventoryLookupResult {
  inventoryId: string;
  facilityId: string;
  itemName: string;
  resourceType: string;
  unit: string;
  metadata: Record<string, unknown>;
  currentStock: number;
  reservedThreshold: number | null;
}

export const lookupInventoryItem = async (
  facilityId: string,
  itemName: string,
  resourceType: string
): Promise<InventoryLookupResult | null> => {
  try {
    const url = new URL(`${base()}/inventory/lookup`);
    url.searchParams.set('facilityId', facilityId);
    // Normalize before lookup — items are stored lowercase
    url.searchParams.set('itemName', itemName.trim().toLowerCase());
    url.searchParams.set('resourceType', resourceType);

    const response = await fetch(url.toString());

    if (!response.ok) return null;

    const body = (await response.json()) as ApiResponse<InventoryLookupResult>;

    return body.success && body.data ? body.data : null;
  } catch {
    return null;
  }
};

export const createInventoryForTransfer = async (
  facilityId: string,
  itemName: string,
  resourceType: string,
  unit: string,
  metadata: Record<string, unknown>,
  createdById: string
): Promise<{ inventoryId: string } | null> => {
  try {
    const response = await fetch(`${base()}/inventory/create-for-transfer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        facilityId,
        itemName,
        resourceType,
        unit,
        metadata,
        createdById,
      }),
    });

    if (!response.ok) return null;

    const body = (await response.json()) as ApiResponse<{
      inventoryId: string;
    }>;
    return body.success && body.data ? body.data : null;
  } catch {
    return null;
  }
};

export const recordInternalStockMovement = async (
  inventoryId: string,
  facilityId: string,
  quantity: number,
  movementType: 'TRANSFER_OUT' | 'TRANSFER_IN',
  reason: string,
  performedById: string,
  referenceId: string
): Promise<void> => {
  try {
    await fetch(`${base()}/inventory/${inventoryId}/movements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quantity,
        movementType,
        reason,
        performedById,
        referenceId,
        facilityId,
      }),
    });
  } catch {
    console.error(
      `[coordination] Failed to record ${movementType} movement for inventory ${inventoryId}`
    );
  }
};
