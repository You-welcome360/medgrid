import { ApiResponse, CreateInventoryBatchDTO } from '@medgrid/shared';

import { createInventory } from '../inventory/inventory.repository';

export const createInventoryBatch = async (
  data: CreateInventoryBatchDTO
): Promise<ApiResponse<unknown>> => {
  return await createInventory(data);
};
