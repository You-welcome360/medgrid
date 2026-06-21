import { api } from './client';
import type { User, UserStatus } from '@/types';

type AssignableRole = 'COORDINATION_MANAGER' | 'INVENTORY_MANAGER';

export const usersApi = {
  list: () => api.get<User[]>('/users'),

  get: (id: string) => api.get<User>(`/users/${id}`),

  invite: (email: string, role: AssignableRole) =>
    api.post<{ userId: string; invitationToken: string; expiresAt: string }>(
      '/users/invite',
      { email, role }
    ),

  completeInvitation: (
    token: string,
    data: { firstName: string; lastName: string; password: string }
  ) => api.post<User>(`/users/invite/complete?token=${token}`, data),

  updateStatus: (id: string, status: UserStatus) =>
    api.patch<User>(`/users/${id}/status`, { status }),

  elevate: (password: string, targetFacilityId: string) =>
    api.post<{
      elevatedToken: string;
      targetFacilityId: string;
      expiresAt: string;
    }>('/users/elevate', { password, targetFacilityId }),
};
