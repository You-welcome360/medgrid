import { InventoryStatus, InventoryUnit, ResourceType } from '../../enums';

import { InventoryMetadata } from '../../types';

export interface InventoryItemDTO {
  id: string;

  facilityId: string;

  resourceType: ResourceType;

  itemName: string;

  quantity: number;

  unit: InventoryUnit;

  status: InventoryStatus;

  lowStockThreshold: number | null;

  metadata: InventoryMetadata;

  price?: number;

  isMovable: boolean;


  createdById: string;

  createdAt: string;

  updatedAt: string;
}
