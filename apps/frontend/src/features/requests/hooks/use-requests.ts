import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { requestsApi } from '@/api/requests.api';
import { inventoryApi } from '@/api/inventory.api';
import type { RequestStatus, ResourceType } from '@/types';

const KEYS = {
  all: ['requests'] as const,
  list: (status?: RequestStatus) => ['requests', 'list', status] as const,
  detail: (id: string) => ['requests', id] as const,
  broadcasts: ['requests', 'broadcasts'] as const,
};

export function useAvailableInventory(
  facilityId?: string,
  resourceType?: ResourceType
) {
  return useQuery({
    queryKey: ['inventory', 'available', facilityId, resourceType] as const,
    queryFn: () => inventoryApi.getAvailable(facilityId!, resourceType),
    select: (res) => res.data ?? [],
    enabled: !!facilityId,
  });
}

export function useRequests(status?: RequestStatus) {
  return useQuery({
    queryKey: KEYS.list(status),
    queryFn: () => requestsApi.list(status),
    select: (res) => res.data ?? [],
  });
}

export function useRequest(id: string) {
  return useQuery({
    queryKey: KEYS.detail(id),
    queryFn: () => requestsApi.get(id),
    select: (res) => res.data,
    enabled: !!id,
  });
}

export function useCreateRequest() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: requestsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      toast.success('Resource request created successfully');
    },
    onError: (err: Error) => {
      toast.error(err.message ?? 'Failed to create request');
    },
  });
}

export function useAcceptRequest() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => requestsApi.accept(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      // Toast is handled by the component — it needs to inspect the warning first
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useRejectRequest() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      requestsApi.reject(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      toast.success('Request rejected');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDispatchRequest() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => requestsApi.dispatch(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      toast.success('Request dispatched — now in transit');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useConfirmReceipt() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => requestsApi.confirm(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      toast.success('Receipt confirmed — request completed');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useCancelRequest() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      requestsApi.cancel(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      toast.success('Request cancelled');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useFailRequest() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => requestsApi.fail(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      toast.success('Request marked as failed');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useBroadcasts(ignoreRadius: boolean = false) {
  return useQuery({
    queryKey: [...KEYS.broadcasts, { ignoreRadius }],
    queryFn: () => requestsApi.listBroadcasts(ignoreRadius),
    select: (res) => res.data ?? [],
    refetchInterval: 15000,
  });
}

export function useAcceptBroadcast() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => requestsApi.acceptBroadcast(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      toast.success('SOS Broadcast claimed and accepted successfully!');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to claim broadcast'),
  });
}

export function useDeclineBroadcast() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => requestsApi.declineBroadcast(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      toast.success('Broadcast dismissed from your view');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to decline broadcast'),
  });
}
