import type {
  ApiResponse,
  ApproveOnboardingResponseDTO,
  OnboardingRequestDTO,
  RejectOnboardingRequestDTO,
  SubmitOnboardingRequestDTO,
} from '@medgrid/shared';

import { services } from '../../config/services';

const base = () => `${services.facilityService}/onboarding-requests`;

export const submitOnboardingRequestToFacilityService = async (
  data: SubmitOnboardingRequestDTO
): Promise<ApiResponse<OnboardingRequestDTO>> => {
  const response = await fetch(base(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  return response.json() as Promise<ApiResponse<OnboardingRequestDTO>>;
};

export const getOnboardingRequestsFromFacilityService = async (
  status: string | undefined,
  authorizationHeader: string | undefined,
  adminId: string
): Promise<ApiResponse<OnboardingRequestDTO[]>> => {
  const url = new URL(base());

  if (status) {
    url.searchParams.set('status', status);
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: authorizationHeader ?? '',
      'x-admin-id': adminId,
    },
  });

  return response.json() as Promise<ApiResponse<OnboardingRequestDTO[]>>;
};

export const getOnboardingRequestByIdFromFacilityService = async (
  id: string,
  authorizationHeader: string | undefined,
  adminId: string
): Promise<ApiResponse<OnboardingRequestDTO>> => {
  const response = await fetch(`${base()}/${id}`, {
    method: 'GET',
    headers: {
      Authorization: authorizationHeader ?? '',
      'x-admin-id': adminId,
    },
  });

  return response.json() as Promise<ApiResponse<OnboardingRequestDTO>>;
};

export const rejectOnboardingRequestInFacilityService = async (
  id: string,
  data: RejectOnboardingRequestDTO,
  authorizationHeader: string | undefined,
  adminId: string
): Promise<ApiResponse<OnboardingRequestDTO>> => {
  const response = await fetch(`${base()}/${id}/reject`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authorizationHeader ?? '',
      'x-admin-id': adminId,
    },
    body: JSON.stringify(data),
  });

  return response.json() as Promise<ApiResponse<OnboardingRequestDTO>>;
};

export const approveOnboardingRequestInFacilityService = async (
  id: string,
  authorizationHeader: string | undefined,
  adminId: string
): Promise<ApiResponse<ApproveOnboardingResponseDTO>> => {
  const response = await fetch(`${base()}/${id}/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authorizationHeader ?? '',
      'x-admin-id': adminId,
    },
  });

  return response.json() as Promise<ApiResponse<ApproveOnboardingResponseDTO>>;
};
