import { api } from './client';
import type { User, UserStatus } from '@/types';

type AssignableRole =
  | 'SUPER_ADMIN'
  | 'COORDINATION_MANAGER'
  | 'INVENTORY_MANAGER';

export const usersApi = {
  list: () => api.get<User[]>('/users'),

  get: (id: string) => api.get<User>(`/users/${id}`),

  invite: (email: string, role: AssignableRole, elevatedToken?: string) =>
    api.post<{ userId: string; invitationToken: string; expiresAt: string }>(
      '/users/invite',
      { email, role },
      elevatedToken ? { Authorization: `Bearer ${elevatedToken}` } : undefined
    ),

  completeInvitation: (
    token: string,
    data: { firstName: string; lastName: string; password: string }
  ) => api.post<User>(`/users/invite/complete?token=${token}`, data),

  updateStatus: (id: string, status: UserStatus) =>
    api.patch<User>(`/users/${id}/status`, { status }),

  elevate: (password: string, targetFacilityId?: string | null) =>
    api.post<{
      elevatedToken: string;
      targetFacilityId?: string | null;
      expiresAt: string;
    }>('/users/elevate', { password, targetFacilityId }),
};

