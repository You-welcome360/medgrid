import { api } from '@/lib/axios';
import type { Notification } from '@/types';

export interface NotificationFilters {
  type?: string;
  read?: boolean;
  page?: number;
  limit?: number;
}

export const getNotifications = (filters: NotificationFilters = {}) =>
  api
    .get<{
      notifications: Notification[];
      pagination: { page: number; limit: number; total: number };
      unread_count: number;
    }>('/notifications', { params: filters })
    .then((r) => r.data);

export const getUnreadCount = () =>
  api.get<{ unread_count: number }>('/notifications/unread-count').then((r) => r.data);

export const markRead = (id: string) =>
  api.put<{ id: string; read_at: string }>(`/notifications/${id}/read`).then((r) => r.data);

export const markAllRead = () =>
  api
    .put<{ message: string; updated_count: number }>('/notifications/mark-all-read')
    .then((r) => r.data);
