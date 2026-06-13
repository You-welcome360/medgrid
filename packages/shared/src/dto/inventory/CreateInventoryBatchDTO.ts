import { InventoryMetadata } from '../../types';

import { InventoryUnit, ResourceType } from '../../enums';

export interface CreateInventoryBatchDTO {
  resourceType: ResourceType;

  itemName: string;

  quantity: number;

  unit: InventoryUnit;

  metadata: InventoryMetadata;
}
