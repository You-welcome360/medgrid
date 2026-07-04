import { api } from '@/lib/axios';
import type { NotificationPreference } from '@/types';

export const getNotificationPreferences = () =>
  api
    .get<{ preferences: NotificationPreference[] }>('/user/notification-preferences')
    .then((r) => r.data);

export interface UpdatePreferencesPayload {
  push?: { enabled?: boolean; emergency_only?: boolean };
  email?: { enabled?: boolean; emergency_only?: boolean };
}

export const updateNotificationPreferences = (payload: UpdatePreferencesPayload) =>
  api
    .put<{ message: string }>('/user/notification-preferences', payload)
    .then((r) => r.data);
