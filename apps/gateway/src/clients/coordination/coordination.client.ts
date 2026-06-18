import type { ApiResponse } from '@medgrid/shared';
import { services } from '../../config/services';

interface HealthData {
  status: string;
}

export const getCoordinationServiceHealth = async (): Promise<
  ApiResponse<HealthData>
> => {
  const response = await fetch(`${services.coordinationService}/health`);

  return response.json() as Promise<ApiResponse<HealthData>>;
};
