import type {
  ApiResponse,
  CancelRequestDTO,
  CreateRequestDTO,
  RejectRequestDTO,
  ResourceRequestDTO,
} from '@medgrid/shared';

import { services } from '../../config/services';

const base = () => `${services.coordinationService}/requests`;

interface RequestHeaders {
  authorizationHeader?: string;
  facilityId: string | null;
  userId: string;
}

const buildHeaders = (headers: RequestHeaders) => ({
  Authorization: headers.authorizationHeader ?? '',
  'x-facility-id': headers.facilityId ?? 'null',
  'x-user-id': headers.userId,
});

export const createRequestInCoordinationService = async (
  data: CreateRequestDTO,
  headers: RequestHeaders
): Promise<ApiResponse<ResourceRequestDTO>> => {
  const response = await fetch(base(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...buildHeaders(headers),
    },
    body: JSON.stringify(data),
  });

  return response.json() as Promise<ApiResponse<ResourceRequestDTO>>;
};

export const getRequestsFromCoordinationService = async (
  headers: RequestHeaders,
  status?: string
): Promise<ApiResponse<ResourceRequestDTO[]>> => {
  const url = new URL(base());

  if (status) url.searchParams.set('status', status);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: buildHeaders(headers),
  });

  return response.json() as Promise<ApiResponse<ResourceRequestDTO[]>>;
};

export const getRequestByIdFromCoordinationService = async (
  id: string,
  headers: RequestHeaders
): Promise<ApiResponse<ResourceRequestDTO>> => {
  const response = await fetch(`${base()}/${id}`, {
    method: 'GET',
    headers: buildHeaders(headers),
  });

  return response.json() as Promise<ApiResponse<ResourceRequestDTO>>;
};

export const acceptRequestInCoordinationService = async (
  id: string,
  headers: RequestHeaders
): Promise<ApiResponse<ResourceRequestDTO>> => {
  const response = await fetch(`${base()}/${id}/accept`, {
    method: 'POST',
    headers: buildHeaders(headers),
  });

  return response.json() as Promise<ApiResponse<ResourceRequestDTO>>;
};

export const rejectRequestInCoordinationService = async (
  id: string,
  data: RejectRequestDTO,
  headers: RequestHeaders
): Promise<ApiResponse<ResourceRequestDTO>> => {
  const response = await fetch(`${base()}/${id}/reject`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...buildHeaders(headers),
    },
    body: JSON.stringify(data),
  });

  return response.json() as Promise<ApiResponse<ResourceRequestDTO>>;
};

export const dispatchRequestInCoordinationService = async (
  id: string,
  headers: RequestHeaders
): Promise<ApiResponse<ResourceRequestDTO>> => {
  const response = await fetch(`${base()}/${id}/dispatch`, {
    method: 'POST',
    headers: buildHeaders(headers),
  });

  return response.json() as Promise<ApiResponse<ResourceRequestDTO>>;
};

export const confirmReceiptInCoordinationService = async (
  id: string,
  headers: RequestHeaders
): Promise<ApiResponse<ResourceRequestDTO>> => {
  const response = await fetch(`${base()}/${id}/confirm`, {
    method: 'POST',
    headers: buildHeaders(headers),
  });

  return response.json() as Promise<ApiResponse<ResourceRequestDTO>>;
};

export const cancelRequestInCoordinationService = async (
  id: string,
  data: CancelRequestDTO,
  headers: RequestHeaders
): Promise<ApiResponse<ResourceRequestDTO>> => {
  const response = await fetch(`${base()}/${id}/cancel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...buildHeaders(headers),
    },
    body: JSON.stringify(data),
  });

  return response.json() as Promise<ApiResponse<ResourceRequestDTO>>;
};

export const markFailedInCoordinationService = async (
  id: string,
  headers: RequestHeaders
): Promise<ApiResponse<ResourceRequestDTO>> => {
  const response = await fetch(`${base()}/${id}/fail`, {
    method: 'POST',
    headers: buildHeaders(headers),
  });

  return response.json() as Promise<ApiResponse<ResourceRequestDTO>>;
};

export const getBroadcastsFromCoordinationService = async (
  headers: RequestHeaders,
  ignoreRadius?: boolean
): Promise<ApiResponse<ResourceRequestDTO[]>> => {
  const url = new URL(`${base()}/broadcasts`);
  if (ignoreRadius) {
    url.searchParams.set('ignoreRadius', 'true');
  }
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: buildHeaders(headers),
  });

  return response.json() as Promise<ApiResponse<ResourceRequestDTO[]>>;
};

export const acceptBroadcastInCoordinationService = async (
  id: string,
  headers: RequestHeaders
): Promise<ApiResponse<ResourceRequestDTO>> => {
  const response = await fetch(`${base()}/${id}/accept-broadcast`, {
    method: 'POST',
    headers: buildHeaders(headers),
  });

  return response.json() as Promise<ApiResponse<ResourceRequestDTO>>;
};

export const declineBroadcastInCoordinationService = async (
  id: string,
  headers: RequestHeaders
): Promise<ApiResponse<null>> => {
  const response = await fetch(`${base()}/${id}/decline-broadcast`, {
    method: 'POST',
    headers: buildHeaders(headers),
  });

  return response.json() as Promise<ApiResponse<null>>;
};
