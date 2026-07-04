import type { ApiResponse, CreateFacilityDTO, UpdateFacilityDTO } from '@medgrid/shared';

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

export const updateFacilityInFacilityService = async (
  id: string,
  payload: UpdateFacilityDTO
): Promise<ApiResponse<FacilityDTO>> => {
  const response = await fetch(`${base()}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

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

export const getFacilityBalanceFromFacilityService = async (
  facilityId: string
): Promise<ApiResponse<{ facilityId: string; balance: number }>> => {
  const response = await fetch(`${base()}/balance`, {
    method: 'GET',
    headers: {
      'x-facility-id': facilityId,
    },
  });
  if (!response.ok) {
    const err = (await response.json().catch(() => ({}))) as any;
    throw new Error(err.message || 'Failed to get facility balance');
  }
  return response.json() as Promise<ApiResponse<{ facilityId: string; balance: number }>>;
};

export const initializeFacilityTopUpInFacilityService = async (
  facilityId: string,
  payload: any
): Promise<ApiResponse<{ payment_url: string; reference: string }>> => {
  const response = await fetch(`${base()}/balance/top-up`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-facility-id': facilityId,
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const err = (await response.json().catch(() => ({}))) as any;
    throw new Error(err.message || 'Failed to initialize top-up');
  }
  return response.json() as Promise<ApiResponse<{ payment_url: string; reference: string }>>;
};

export const getFacilityBalanceHistoryFromFacilityService = async (
  facilityId: string,
  query: { page?: number; limit?: number; type?: string }
): Promise<ApiResponse<any>> => {
  const url = new URL(`${base()}/balance/history`);
  if (query.page) url.searchParams.append('page', String(query.page));
  if (query.limit) url.searchParams.append('limit', String(query.limit));
  if (query.type) url.searchParams.append('type', String(query.type));

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'x-facility-id': facilityId,
    },
  });
  if (!response.ok) {
    const err = (await response.json().catch(() => ({}))) as any;
    throw new Error(err.message || 'Failed to get balance history');
  }
  return response.json() as Promise<ApiResponse<any>>;
};

export const relayPaystackWebhookToFacilityService = async (
  rawBody: string,
  signature: string | undefined,
  body: any
): Promise<any> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (signature) {
    headers['x-paystack-signature'] = signature;
  }

  const response = await fetch(`${base()}/webhooks/paystack`, {
    method: 'POST',
    headers,
    body: rawBody,
  });
  if (!response.ok) {
    const err = (await response.json().catch(() => ({}))) as any;
    throw new Error(err.message || 'Failed to relay webhook');
  }
  return response.json();
};

