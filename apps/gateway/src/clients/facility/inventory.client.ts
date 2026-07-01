import type {
  ApiResponse,
  CreateInventoryBatchDTO,
  CreateStockMovementDTO,
  InventoryItemDTO,
  LowStockAlertDTO,
  StockMovementDTO,
  UpdateInventoryStatusDTO,
} from '@medgrid/shared';

import { services } from '../../config/services';

const base = () => `${services.facilityService}/inventory`;

interface InventoryHeaders {
  authorizationHeader?: string;
  facilityId: string;
  userId: string;
}

export const createInventoryInFacilityService = async (
  data: CreateInventoryBatchDTO,
  headers: InventoryHeaders
): Promise<ApiResponse<InventoryItemDTO>> => {
  const response = await fetch(base(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: headers.authorizationHeader ?? '',
      'x-facility-id': headers.facilityId,
      'x-user-id': headers.userId,
    },
    body: JSON.stringify(data),
  });

  return response.json() as Promise<ApiResponse<InventoryItemDTO>>;
};

export const getInventoryFromFacilityService = async (
  headers: InventoryHeaders,
  resourceType?: string,
  status?: string
): Promise<ApiResponse<InventoryItemDTO[]>> => {
  const url = new URL(base());

  if (resourceType) url.searchParams.set('resourceType', resourceType);
  if (status) url.searchParams.set('status', status);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: headers.authorizationHeader ?? '',
      'x-facility-id': headers.facilityId,
      'x-user-id': headers.userId,
    },
  });

  return response.json() as Promise<ApiResponse<InventoryItemDTO[]>>;
};

export const getInventoryItemFromFacilityService = async (
  id: string,
  headers: InventoryHeaders
): Promise<ApiResponse<InventoryItemDTO>> => {
  const response = await fetch(`${base()}/${id}`, {
    method: 'GET',
    headers: {
      Authorization: headers.authorizationHeader ?? '',
      'x-facility-id': headers.facilityId,
      'x-user-id': headers.userId,
    },
  });

  return response.json() as Promise<ApiResponse<InventoryItemDTO>>;
};

export const updateInventoryStatusInFacilityService = async (
  id: string,
  data: UpdateInventoryStatusDTO,
  headers: InventoryHeaders
): Promise<ApiResponse<InventoryItemDTO>> => {
  const response = await fetch(`${base()}/${id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: headers.authorizationHeader ?? '',
      'x-facility-id': headers.facilityId,
      'x-user-id': headers.userId,
    },
    body: JSON.stringify(data),
  });

  return response.json() as Promise<ApiResponse<InventoryItemDTO>>;
};

export const deleteInventoryInFacilityService = async (
  id: string,
  headers: InventoryHeaders
): Promise<ApiResponse<null>> => {
  const response = await fetch(`${base()}/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: headers.authorizationHeader ?? '',
      'x-facility-id': headers.facilityId,
      'x-user-id': headers.userId,
    },
  });

  return response.json() as Promise<ApiResponse<null>>;
};

export const createStockMovementInFacilityService = async (
  id: string,
  data: CreateStockMovementDTO,
  headers: InventoryHeaders
): Promise<ApiResponse<StockMovementDTO>> => {
  const response = await fetch(`${base()}/${id}/movements`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: headers.authorizationHeader ?? '',
      'x-facility-id': headers.facilityId,
      'x-user-id': headers.userId,
    },
    body: JSON.stringify(data),
  });

  return response.json() as Promise<ApiResponse<StockMovementDTO>>;
};

export const getStockMovementsFromFacilityService = async (
  id: string,
  headers: InventoryHeaders
): Promise<ApiResponse<StockMovementDTO[]>> => {
  const response = await fetch(`${base()}/${id}/movements`, {
    method: 'GET',
    headers: {
      Authorization: headers.authorizationHeader ?? '',
      'x-facility-id': headers.facilityId,
      'x-user-id': headers.userId,
    },
  });

  return response.json() as Promise<ApiResponse<StockMovementDTO[]>>;
};

export const setThresholdInFacilityService = async (
  id: string,
  data: { threshold: number },
  headers: InventoryHeaders
): Promise<ApiResponse<InventoryItemDTO>> => {
  const response = await fetch(`${base()}/${id}/threshold`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: headers.authorizationHeader ?? '',
      'x-facility-id': headers.facilityId,
      'x-user-id': headers.userId,
    },
    body: JSON.stringify(data),
  });

  return response.json() as Promise<ApiResponse<InventoryItemDTO>>;
};

export const getActiveAlertsFromFacilityService = async (
  headers: InventoryHeaders
): Promise<ApiResponse<LowStockAlertDTO[]>> => {
  const response = await fetch(`${base()}/alerts/active`, {
    method: 'GET',
    headers: {
      Authorization: headers.authorizationHeader ?? '',
      'x-facility-id': headers.facilityId,
      'x-user-id': headers.userId,
    },
  });

  return response.json() as Promise<ApiResponse<LowStockAlertDTO[]>>;
};

export const getAlertsByInventoryFromFacilityService = async (
  id: string,
  headers: InventoryHeaders
): Promise<ApiResponse<LowStockAlertDTO[]>> => {
  const response = await fetch(`${base()}/${id}/alerts`, {
    method: 'GET',
    headers: {
      Authorization: headers.authorizationHeader ?? '',
      'x-facility-id': headers.facilityId,
      'x-user-id': headers.userId,
    },
  });

  return response.json() as Promise<ApiResponse<LowStockAlertDTO[]>>;
};

export const setReservedThresholdInFacilityService = async (
  id: string,
  data: { threshold: number },
  headers: InventoryHeaders
): Promise<ApiResponse<InventoryItemDTO>> => {
  const response = await fetch(`${base()}/${id}/reserved-threshold`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: headers.authorizationHeader ?? '',
      'x-facility-id': headers.facilityId,
      'x-user-id': headers.userId,
    },
    body: JSON.stringify(data),
  });

  return response.json() as Promise<ApiResponse<InventoryItemDTO>>;
};

export const getAvailableInventoryFromFacilityService = async (
  facilityId: string,
  resourceType: string | undefined,
  headers: InventoryHeaders
): Promise<ApiResponse<InventoryItemDTO[]>> => {
  const url = new URL(`${base()}/available`);
  url.searchParams.set('facilityId', facilityId);
  if (resourceType) url.searchParams.set('resourceType', resourceType);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: headers.authorizationHeader ?? '',
      'x-facility-id': headers.facilityId,
      'x-user-id': headers.userId,
    },
  });

  return response.json() as Promise<ApiResponse<InventoryItemDTO[]>>;
};

export const getNetworkResourcesFromFacilityService = async (
  headers: InventoryHeaders
): Promise<ApiResponse<Array<{ resourceType: string; itemName: string; isMovable: boolean }>>> => {
  const response = await fetch(`${base()}/network/resources`, {
    method: 'GET',
    headers: {
      Authorization: headers.authorizationHeader ?? '',
      'x-facility-id': headers.facilityId,
      'x-user-id': headers.userId,
    },
  });

  return response.json() as Promise<ApiResponse<Array<{ resourceType: string; itemName: string; isMovable: boolean }>>>;
};

export const getNetworkFacilitiesFromFacilityService = async (
  resourceType: string,
  itemName: string | undefined,
  headers: InventoryHeaders
): Promise<ApiResponse<unknown[]>> => {
  const url = new URL(`${base()}/network/facilities`);
  url.searchParams.set('resourceType', resourceType);
  if (itemName) url.searchParams.set('itemName', itemName);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: headers.authorizationHeader ?? '',
      'x-facility-id': headers.facilityId,
      'x-user-id': headers.userId,
    },
  });

  return response.json() as Promise<ApiResponse<unknown[]>>;
};

