import { api } from './client';
import type {
  ResourceRequest,
  RequestStatus,
  RequestPriority,
  ResourceType,
  InventoryUnit,
  PatientInfo,
} from '@/types';

export const requestsApi = {
  list: (status?: RequestStatus) => {
    const qs = status ? `?status=${status}` : '';
    return api.get<ResourceRequest[]>(`/requests${qs}`);
  },

  get: (id: string) => api.get<ResourceRequest>(`/requests/${id}`),

  create: (data: {
    supplyingFacilityId?: string;
    resourceType: ResourceType;
    itemName: string;
    quantity: number;
    unit: InventoryUnit;
    priority: RequestPriority;
    description: string;
    patient?: PatientInfo;
    isEmergency?: boolean;
    isBroadcast?: boolean;
    maxRadiusKm?: number;
  }) => api.post<ResourceRequest>('/requests', data),

  accept: (id: string) => api.post<ResourceRequest>(`/requests/${id}/accept`),

  reject: (id: string, reason: string) =>
    api.post<ResourceRequest>(`/requests/${id}/reject`, { reason }),

  dispatch: (id: string) =>
    api.post<ResourceRequest>(`/requests/${id}/dispatch`),

  confirm: (id: string) => api.post<ResourceRequest>(`/requests/${id}/confirm`),

  cancel: (id: string, reason: string) =>
    api.post<ResourceRequest>(`/requests/${id}/cancel`, { reason }),

  fail: (id: string) => api.post<ResourceRequest>(`/requests/${id}/fail`),

  listBroadcasts: (ignoreRadius?: boolean) => {
    const qs = ignoreRadius ? '?ignoreRadius=true' : '';
    return api.get<ResourceRequest[]>(`/requests/broadcasts${qs}`);
  },

  acceptBroadcast: (id: string) =>
    api.post<ResourceRequest>(`/requests/${id}/accept-broadcast`),

  declineBroadcast: (id: string) =>
    api.post<null>(`/requests/${id}/decline-broadcast`),
};
