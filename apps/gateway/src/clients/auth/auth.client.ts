import type {
  ApiResponse,
  AuthenticatedUserDTO,
  ChangePasswordDTO,
  LoginDTO,
  LoginResponseDTO,
} from '@medgrid/shared';

import { services } from '../../config/services';

interface AuthServiceResponse<T> {
  statusCode: number;
  body: ApiResponse<T>;
  setCookie: string | null;
}

export const loginWithAuthService = async (
  data: LoginDTO
): Promise<AuthServiceResponse<LoginResponseDTO>> => {
  const response = await fetch(`${services.authService}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  const body = (await response.json()) as ApiResponse<LoginResponseDTO>;

  return {
    statusCode: response.status,
    body,
    setCookie: response.headers.get('set-cookie'),
  };
};

export const refreshWithAuthService = async (
  cookieHeader: string | undefined
): Promise<AuthServiceResponse<LoginResponseDTO>> => {
  const response = await fetch(`${services.authService}/auth/refresh`, {
    method: 'POST',
    headers: {
      Cookie: cookieHeader ?? '',
    },
  });

  const body = (await response.json()) as ApiResponse<LoginResponseDTO>;

  return {
    statusCode: response.status,
    body,
    setCookie: response.headers.get('set-cookie'),
  };
};

export const logoutWithAuthService = async (
  cookieHeader: string | undefined
): Promise<AuthServiceResponse<null>> => {
  const response = await fetch(`${services.authService}/auth/logout`, {
    method: 'POST',
    headers: {
      Cookie: cookieHeader ?? '',
    },
  });

  const body = (await response.json()) as ApiResponse<null>;

  return {
    statusCode: response.status,
    body,
    setCookie: response.headers.get('set-cookie'),
  };
};

export const getMeFromAuthService = async (
  authorizationHeader: string | undefined,
  cookieHeader: string | undefined
): Promise<AuthServiceResponse<AuthenticatedUserDTO>> => {
  const response = await fetch(`${services.authService}/auth/me`, {
    method: 'GET',
    headers: {
      Authorization: authorizationHeader ?? '',
      Cookie: cookieHeader ?? '',
    },
  });

  const body = (await response.json()) as ApiResponse<AuthenticatedUserDTO>;

  return {
    statusCode: response.status,
    body,
    setCookie: response.headers.get('set-cookie'),
  };
};

export const changePasswordWithAuthService = async (
  authorizationHeader: string | undefined,
  data: ChangePasswordDTO
): Promise<AuthServiceResponse<null>> => {
  const response = await fetch(`${services.authService}/auth/change-password`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authorizationHeader ?? '',
    },
    body: JSON.stringify(data),
  });

  const body = (await response.json()) as ApiResponse<null>;

  return {
    statusCode: response.status,
    body,
    setCookie: response.headers.get('set-cookie'),
  };
};
