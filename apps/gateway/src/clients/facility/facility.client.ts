import type { ApiResponse, CreateFacilityDTO } from '@medgrid/shared';

import { services } from '../../config/services';

// Facility DTO shape returned from the facility-service
interface FacilityDTO {
  id: string;
  name: string;
  type: string;
  status: string;
  phone: string;
  email: string;
  region: string;
  district: string;
  addressLine?: string | null;
  latitude: number;
  longitude: number;
  createdAt: string;
  updatedAt: string;
}

interface CreateFacilityResponse {
  facilityId: string;
}

const base = () => `${services.facilityService}/facilities`;

export const createFacilityInFacilityService = async (
  payload: CreateFacilityDTO
): Promise<ApiResponse<CreateFacilityResponse>> => {
  const response = await fetch(base(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  return response.json() as Promise<ApiResponse<CreateFacilityResponse>>;
};

export const getAllFacilitiesFromFacilityService = async (): Promise<
  ApiResponse<FacilityDTO[]>
> => {
  const response = await fetch(base(), { method: 'GET' });
  return response.json() as Promise<ApiResponse<FacilityDTO[]>>;
};

export const getFacilityByIdFromFacilityService = async (
  id: string
): Promise<ApiResponse<FacilityDTO>> => {
  const response = await fetch(`${base()}/${id}`, { method: 'GET' });
  return response.json() as Promise<ApiResponse<FacilityDTO>>;
};

export const getFacilityServiceHealth = async (): Promise<
  ApiResponse<{ status: string }>
> => {
  const response = await fetch(`${services.facilityService}/health`, {
    method: 'GET',
  });

  return response.json() as Promise<ApiResponse<{ status: string }>>;
};
