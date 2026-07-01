import { api } from './client';
import type {
  Facility,
  OnboardingRequest,
  OnboardingRequestStatus,
  FacilityType,
} from '@/types';

export const facilitiesApi = {
  // Onboarding — public
  submitOnboardingRequest: (data: {
    facilityName: string;
    facilityType: FacilityType;
    facilityPhone: string;
    facilityEmail: string;
    address: { region: string; district: string; addressLine?: string };
    location: { latitude: number; longitude: number };
    adminFirstName: string;
    adminLastName: string;
    adminEmail: string;
    adminPhone?: string;
  }) => api.post<OnboardingRequest>('/onboarding-requests', data),

  // Onboarding — super admin
  listOnboardingRequests: (status?: OnboardingRequestStatus) => {
    const qs = status ? `?status=${status}` : '';
    return api.get<OnboardingRequest[]>(`/onboarding-requests${qs}`);
  },

  getOnboardingRequest: (id: string) =>
    api.get<OnboardingRequest>(`/onboarding-requests/${id}`),

  approveOnboardingRequest: (id: string) =>
    api.post<{
      facilityId: string;
      facilityAdminId: string;
      temporaryPassword: string;
    }>(`/onboarding-requests/${id}/approve`),

  rejectOnboardingRequest: (id: string, reason: string) =>
    api.post<OnboardingRequest>(`/onboarding-requests/${id}/reject`, {
      reason,
    }),

  // Facilities — read
  list: () => api.get<Facility[]>('/facilities'),

  get: (id: string) => api.get<Facility>(`/facilities/${id}`),

  update: (
    id: string,
    data: {
      facilityName?: string;
      phone?: string;
      email?: string;
      address?: { region: string; district: string; addressLine?: string | null };
      location?: { latitude: number; longitude: number };
    }
  ) => api.patch<Facility>(`/facilities/${id}`, data),
};
