import { api } from '@/lib/axios';
import type {
  CoordinationRequest,
  NearbyRequest,
  CreateRequestPayload,
  FulfillRequestPayload,
  ResourceType,
} from '@/types';

// ─── Resource Types ───────────────────────────────────────────────────────────
export const getResourceTypes = () =>
  api.get<{ resource_types: ResourceType[] }>('/coordination/resource-types').then((r) => r.data);

// ─── Requests ─────────────────────────────────────────────────────────────────
export interface RequestFilters {
  status?: string;
  classification?: string;
  urgency_level?: string;
  resource_type_id?: string;
  page?: number;
  limit?: number;
}

export const getRequests = (filters: RequestFilters = {}) =>
  api
    .get<{
      requests: CoordinationRequest[];
      pagination: { page: number; limit: number; total: number };
    }>('/coordination/requests', { params: filters })
    .then((r) => r.data);

export const getRequestById = (id: string) =>
  api.get<CoordinationRequest>(`/coordination/requests/${id}`).then((r) => r.data);

export const createRequest = (payload: CreateRequestPayload) =>
  api.post<CoordinationRequest>('/coordination/requests', payload).then((r) => r.data);

export const acknowledgeRequest = (id: string, estimatedResponseTime?: string) =>
  api
    .put<{ id: string; status: string; acknowledged_by: string; acknowledged_at: string }>(
      `/coordination/requests/${id}/acknowledge`,
      { estimated_response_time: estimatedResponseTime }
    )
    .then((r) => r.data);

export const fulfillRequest = (id: string, payload: FulfillRequestPayload = {}) =>
  api
    .put<{
      id: string;
      status: string;
      fulfilled_by: string;
      fulfilled_at: string;
      price_per_unit: number | null;
      total_amount: number | null;
      balance_after?: number;
    }>(`/coordination/requests/${id}/fulfill`, payload)
    .then((r) => r.data);

export const cancelRequest = (id: string) =>
  api
    .put<{ id: string; status: string; refund_amount: number; balance_after: number }>(
      `/coordination/requests/${id}/cancel`,
      {}
    )
    .then((r) => r.data);

export const getNearbyRequests = (radiusKm: number, status?: string) =>
  api
    .get<{ requests: NearbyRequest[] }>('/coordination/requests/nearby', {
      params: { radius_km: radiusKm, ...(status && { status }) },
    })
    .then((r) => r.data);
