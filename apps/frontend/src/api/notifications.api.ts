import { api } from './client';

export interface NotificationItem {
  id: string;
  userId: string;
  facilityId: string;
  type: string;
  channel: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  readAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
}

export interface GetNotificationsResponse {
  notifications: NotificationItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
  };
}

export interface NotificationPreferences {
  websocket: { enabled: boolean; emergencyOnly: boolean };
  push: { enabled: boolean; emergencyOnly: boolean };
  email: { enabled: boolean; emergencyOnly: boolean };
}

export const notificationsApi = {
  list: (params: {
    page: number;
    limit: number;
    read?: boolean;
    type?: string;
  }) => {
    const searchParams = new URLSearchParams();
    searchParams.append('page', String(params.page));
    searchParams.append('limit', String(params.limit));
    if (params.read !== undefined) {
      searchParams.append('read', String(params.read));
    }
    if (params.type) {
      searchParams.append('type', params.type);
    }
    return api.get<GetNotificationsResponse>(
      `/notifications?${searchParams.toString()}`
    );
  },

  markAsRead: (id: string) =>
    api.put<NotificationItem>(`/notifications/${id}/read`, {}),

  markAllAsRead: () => api.put<null>('/notifications/mark-all-read', {}),

  getPreferences: () =>
    api.get<NotificationPreferences>('/notifications/preferences'),

  updatePreferences: (prefs: {
    push?: { enabled: boolean; emergencyOnly: boolean };
    email?: { enabled: boolean; emergencyOnly: boolean };
  }) => api.put<null>('/notifications/preferences', prefs),
};
