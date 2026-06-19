import type {
  ApiResponse,
  ElevateDTO,
  ElevateResponseDTO,
  InviteResponseDTO,
  InviteUserDTO,
  UpdateUserStatusDTO,
  UserDTO,
} from '@medgrid/shared';

import { services } from '../../config/services';

const base = () => `${services.authService}/users`;

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

export const inviteUserInAuthService = async (
  data: InviteUserDTO,
  headers: UserHeaders
): Promise<ApiResponse<InviteResponseDTO>> => {
  const response = await fetch(`${base()}/invite`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...buildHeaders(headers),
    },
    body: JSON.stringify(data),
  });

  return response.json() as Promise<ApiResponse<InviteResponseDTO>>;
};

export const completeInvitationInAuthService = async (
  data: { firstName: string; lastName: string; password: string },
  invitationToken: string
): Promise<ApiResponse<UserDTO>> => {
  const response = await fetch(`${base()}/invite/complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-invitation-token': invitationToken,
    },
    body: JSON.stringify(data),
  });

  return response.json() as Promise<ApiResponse<UserDTO>>;
};

export const listUsersFromAuthService = async (
  headers: UserHeaders
): Promise<ApiResponse<UserDTO[]>> => {
  const response = await fetch(base(), {
    method: 'GET',
    headers: buildHeaders(headers),
  });

  return response.json() as Promise<ApiResponse<UserDTO[]>>;
};

export const getUserByIdFromAuthService = async (
  id: string,
  headers: UserHeaders
): Promise<ApiResponse<UserDTO>> => {
  const response = await fetch(`${base()}/${id}`, {
    method: 'GET',
    headers: buildHeaders(headers),
  });

  return response.json() as Promise<ApiResponse<UserDTO>>;
};

export const updateUserStatusInAuthService = async (
  id: string,
  data: UpdateUserStatusDTO,
  headers: UserHeaders
): Promise<ApiResponse<UserDTO>> => {
  const response = await fetch(`${base()}/${id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...buildHeaders(headers),
    },
    body: JSON.stringify(data),
  });

  return response.json() as Promise<ApiResponse<UserDTO>>;
};

export const elevateInAuthService = async (
  data: ElevateDTO,
  authorizationHeader: string | undefined,
  userId: string
): Promise<ApiResponse<ElevateResponseDTO>> => {
  const response = await fetch(`${base()}/elevate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authorizationHeader ?? '',
      'x-user-id': userId,
      'x-facility-id': 'null',
      'x-user-role': 'SUPER_ADMIN',
    },
    body: JSON.stringify(data),
  });

  return response.json() as Promise<ApiResponse<ElevateResponseDTO>>;
};
