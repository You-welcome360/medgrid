export interface LowStockAlertDTO {
  id: string;

  inventoryId: string;

  facilityId: string;

  itemName: string;

  resourceType: string;

  thresholdAtTime: number;

  quantityAtTime: number;

  resolvedAt: string | null;

  createdAt: string;
}
