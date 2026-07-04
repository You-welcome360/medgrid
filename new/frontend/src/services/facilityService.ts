import { api } from '@/lib/axios';
import type { FacilityBalance, BalanceTransaction, TopUpResponse } from '@/types';

export interface FacilityProfile {
  id: string;
  name: string;
  location: string;
  type: 'HOSPITAL' | 'BLOOD_BANK' | 'PHARMACY' | 'SUPPLIER';
  phone: string;
  latitude: number | null;
  longitude: number | null;
  balance: number;
  created_at: string;
}

export interface UpdateProfilePayload {
  location?: string;
  phone?: string;
  latitude?: number | null;
  longitude?: number | null;
}

export const getProfile = () =>
  api.get<FacilityProfile>('/facility/profile').then((r) => r.data);

export const updateProfile = (data: UpdateProfilePayload) =>
  api.patch<FacilityProfile>('/facility/profile', data).then((r) => r.data);

export const getBalance = () =>
  api.get<FacilityBalance>('/facility/balance').then((r) => r.data);

export const initializeTopUp = (amount: number, callbackUrl: string) =>
  api
    .post<TopUpResponse>('/facility/balance/top-up', { amount, callback_url: callbackUrl })
    .then((r) => r.data);

export interface BalanceHistoryFilters {
  type?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
}

export const getBalanceHistory = (filters: BalanceHistoryFilters = {}) =>
  api
    .get<{
      transactions: BalanceTransaction[];
      pagination: { page: number; limit: number; total: number };
    }>('/facility/balance/history', { params: filters })
    .then((r) => r.data);

