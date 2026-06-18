import { ApiResponse, CreateInventoryBatchDTO } from '@medgrid/shared';

export const createInventory = async (
  data: CreateInventoryBatchDTO
): Promise<ApiResponse<unknown>> => {
  /**
   * Temporary mock persistence.
   *
   * Later this will become:
   * Prisma
   * PostgreSQL
   */

  return {
    success: true,
    message: 'Inventory batch created successfully',
    data: {
      inventoryId: 'inventory-123',
      ...data,
    },
    timestamp: new Date().toISOString(),
  };
};
