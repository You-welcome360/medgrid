import { env } from '../config/env';

const base = () => `${env.FACILITY_SERVICE_URL}/internal`;

interface LookupResult {
  inventoryId: string;
  facilityId: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message: string;
}

export const lookupInventoryItem = async (
  facilityId: string,
  itemName: string,
  resourceType: string
): Promise<LookupResult | null> => {
  try {
    const url = new URL(`${base()}/inventory/lookup`);
    url.searchParams.set('facilityId', facilityId);
    url.searchParams.set('itemName', itemName);
    url.searchParams.set('resourceType', resourceType);

    const response = await fetch(url.toString());

    if (!response.ok) return null;

    const body = (await response.json()) as ApiResponse<LookupResult>;

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
    // Best-effort — log failure but do not block request completion
    console.error(
      `[coordination] Failed to record ${movementType} movement for inventory ${inventoryId}`
    );
  }
};
