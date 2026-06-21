import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { facilitiesApi } from '@/api/facilities.api';
import type { OnboardingRequestStatus } from '@/types';

const KEYS = {
  all: ['onboarding'] as const,
  list: (status?: OnboardingRequestStatus) =>
    ['onboarding', 'list', status] as const,
  detail: (id: string) => ['onboarding', id] as const,
};

export function useOnboardingRequests(status?: OnboardingRequestStatus) {
  return useQuery({
    queryKey: KEYS.list(status),
    queryFn: () => facilitiesApi.listOnboardingRequests(status),
    select: (res) => res.data ?? [],
  });
}

export function useOnboardingRequest(id: string) {
  return useQuery({
    queryKey: KEYS.detail(id),
    queryFn: () => facilitiesApi.getOnboardingRequest(id),
    select: (res) => res.data,
    enabled: !!id,
  });
}

export function useApproveOnboarding() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => facilitiesApi.approveOnboardingRequest(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useRejectOnboarding() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      facilitiesApi.rejectOnboardingRequest(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      toast.success('Onboarding request rejected');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
