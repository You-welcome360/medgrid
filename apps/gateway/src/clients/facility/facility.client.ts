import type { ApiResponse } from '@medgrid/shared';
import { services } from '../../config/services';

interface HealthData {
  status: string;
}

export const getFacilityServiceHealth = async (): Promise<
  ApiResponse<HealthData>
> => {
  const response = await fetch(`${services.facilityService}/health`);

  return response.json() as Promise<ApiResponse<HealthData>>;
};
