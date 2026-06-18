import type { ApiResponse, CreateInventoryBatchDTO } from '@medgrid/shared';
import { services } from '../../config/services';

export const createInventoryBatch = async (
  data: CreateInventoryBatchDTO
): Promise<ApiResponse<unknown>> => {
  const response = await fetch(`${services.facilityService}/inventory`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  return response.json() as Promise<ApiResponse<unknown>>;
};
