import { api } from './client';
import type { LoginResponse, AuthenticatedUser } from '@/types';

export const authApi = {
  login: (email: string, password: string) =>
    api.post<LoginResponse>('/auth/login', { email, password }),

  logout: () => api.post<null>('/auth/logout'),

  refresh: () => api.post<LoginResponse>('/auth/refresh'),

  me: () => api.get<AuthenticatedUser>('/auth/me'),

  changePassword: (currentPassword: string, newPassword: string) =>
    api.patch<null>('/auth/change-password', { currentPassword, newPassword }),
};
