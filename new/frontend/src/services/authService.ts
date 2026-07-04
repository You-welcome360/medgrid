import { api } from '@/lib/axios';
import type {
  LoginResponse,
  ResetPasswordResponse,
  ChangePasswordResponse,
  CreateFacilityResponse,
  CreateManagerResponse,
  Manager,
} from '@/types/auth';

// ─── Authentication ─────────────────────────────────────────────────────────

export const login = (email: string, password: string) =>
  api.post<LoginResponse>('/auth/login', { email, password }).then((r) => r.data);

export const resetPassword = (newPassword: string) =>
  api
    .post<ResetPasswordResponse>('/auth/reset-password', { new_password: newPassword })
    .then((r) => r.data);

export const changePassword = (currentPassword: string, newPassword: string) =>
  api
    .post<ChangePasswordResponse>('/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    })
    .then((r) => r.data);

// ─── Super Admin (Facilities) ────────────────────────────────────────────────

export interface CreateFacilityPayload {
  facility_name: string;
  location: string;
  admin_email: string;
  facility_type: 'HOSPITAL' | 'BLOOD_BANK' | 'PHARMACY' | 'SUPPLIER';
  phone: string;
}

export const createFacility = (payload: CreateFacilityPayload) =>
  api.post<CreateFacilityResponse>('/auth/admin/facilities', payload).then((r) => r.data);

// ─── Facility Admin (Managers) ─────────────────────────────────────────────

export interface CreateManagerPayload {
  email: string;
  role: 'inventory_manager' | 'coordination_manager';
}

export const createManager = (payload: CreateManagerPayload) =>
  api.post<CreateManagerResponse>('/auth/facility/managers', payload).then((r) => r.data);

export const getManagers = (role?: string) =>
  api
    .get<{ managers: Manager[] }>('/auth/facility/managers', {
      params: { role },
    })
    .then((r) => r.data);

export const deactivateManager = (id: string) =>
  api.delete<{ message: string }>(`/auth/facility/managers/${id}`).then((r) => r.data);
