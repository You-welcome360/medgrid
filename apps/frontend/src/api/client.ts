const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api/v1';

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  timestamp: string;
}

class ApiError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
  }
}

let accessToken: string | null = null;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

export const getAccessToken = () => accessToken;

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Default to the global access token; explicit headers can override it
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  // Explicit per-call headers take precedence (e.g. elevated token)
  Object.assign(headers, options.headers as Record<string, string>);

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include', // sends cookies for refresh token
  });

  const body = (await response.json()) as ApiResponse<T>;

  if (!response.ok) {
    throw new ApiError(response.status, body.message ?? 'Request failed');
  }

  return body;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),

  post: <T>(path: string, data?: unknown, headers?: Record<string, string>) =>
    request<T>(path, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
      headers,
    }),

  patch: <T>(path: string, data?: unknown, headers?: Record<string, string>) =>
    request<T>(path, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
      headers,
    }),

  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

export { ApiError };
