import type {
  ApiResponse,
  AuditLogQuery,
  AuditLogDTO,
  PaginatedResponse,
} from '@medgrid/shared';

import { services } from '../../config/services';

const base = () => `${services.authService}/audit-logs`;

interface UserHeaders {
  authorizationHeader?: string;
  facilityId: string | null;
  userId: string;
  userRole: string;
}

const buildHeaders = (headers: UserHeaders) => ({
  Authorization: headers.authorizationHeader ?? '',
  'x-facility-id': headers.facilityId ?? 'null',
  'x-user-id': headers.userId,
  'x-user-role': headers.userRole,
});

export const listAuditLogsFromAuthService = async (
  query: AuditLogQuery,
  headers: UserHeaders
): Promise<ApiResponse<PaginatedResponse<AuditLogDTO>>> => {
  const queryParams = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      queryParams.append(key, String(value));
    }
  });

  const url = `${base()}?${queryParams.toString()}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: buildHeaders(headers),
  });

  return response.json() as Promise<ApiResponse<PaginatedResponse<AuditLogDTO>>>;
};
