import { InventoryMetadata } from '../../types';

import { InventoryUnit, ResourceType } from '../../enums';

export interface CreateInventoryBatchDTO {
  resourceType: ResourceType;

  itemName: string;

  unit: InventoryUnit;

  metadata: InventoryMetadata;
}
