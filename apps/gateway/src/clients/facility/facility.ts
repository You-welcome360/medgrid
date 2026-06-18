import type { ApiResponse, CreateFacilityDTO } from '@medgrid/shared';

import { services } from '../../config/services';

interface CreateFacilityResponse {
  facilityId: string;
}

export const createFacilityInFacilityService = async (
  payload: CreateFacilityDTO
): Promise<ApiResponse<CreateFacilityResponse>> => {
  const response = await fetch(`${services.facilityService}/facilities`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  return response.json() as Promise<ApiResponse<CreateFacilityResponse>>;
};
