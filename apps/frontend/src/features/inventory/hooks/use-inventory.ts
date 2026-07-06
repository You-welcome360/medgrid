import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { inventoryApi } from '@/api/inventory.api';
import type {
  InventoryStatus,
  ResourceType,
  StockMovementType,
  InventoryUnit,
} from '@/types';

const KEYS = {
  all: ['inventory'] as const,
  list: (params?: { resourceType?: ResourceType; status?: InventoryStatus }) =>
    ['inventory', 'list', params] as const,
  detail: (id: string) => ['inventory', id] as const,
  movements: (id: string) => ['inventory', id, 'movements'] as const,
  alerts: ['inventory', 'alerts'] as const,
  expiryAlerts: ['inventory', 'alerts', 'expiry'] as const,
  redistributionOffers: ['inventory', 'redistribution', 'offers'] as const,
  networkResources: ['inventory', 'network', 'resources'] as const,
  networkFacilities: (resourceType: ResourceType, itemName?: string) =>
    ['inventory', 'network', 'facilities', resourceType, itemName] as const,
};

export function useInventory(params?: {
  resourceType?: ResourceType;
  status?: InventoryStatus;
}) {
  return useQuery({
    queryKey: KEYS.list(params),
    queryFn: () => inventoryApi.list(params),
    select: (res) => res.data ?? [],
  });
}

export function useInventoryItem(id: string) {
  return useQuery({
    queryKey: KEYS.detail(id),
    queryFn: () => inventoryApi.get(id),
    select: (res) => res.data,
    enabled: !!id,
  });
}

export function useStockMovements(id: string) {
  return useQuery({
    queryKey: KEYS.movements(id),
    queryFn: () => inventoryApi.getMovements(id),
    select: (res) => res.data ?? [],
    enabled: !!id,
  });
}

export function useActiveAlerts() {
  return useQuery({
    queryKey: KEYS.alerts,
    queryFn: () => inventoryApi.getActiveAlerts(),
    select: (res) => res.data ?? [],
  });
}

export function useCreateInventoryItem() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      resourceType: ResourceType;
      itemName: string;
      unit: InventoryUnit;
      metadata: Record<string, unknown>;
      price?: number;
      isMovable?: boolean;
    }) => inventoryApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      toast.success('Inventory item created');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateInventoryStatus() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: InventoryStatus }) =>
      inventoryApi.updateStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      toast.success('Status updated');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useSetThreshold() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, threshold }: { id: string; threshold: number }) =>
      inventoryApi.setThreshold(id, threshold),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      toast.success('Threshold updated');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useSetReservedThreshold() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, threshold }: { id: string; threshold: number }) =>
      inventoryApi.setReservedThreshold(id, threshold),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      toast.success('Reserved threshold updated');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdatePrice() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, price }: { id: string; price: number }) =>
      inventoryApi.updatePrice(id, price),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      toast.success('Unit price updated');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteInventoryItem() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => inventoryApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      toast.success('Item deleted');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useRecordMovement() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: string;
      quantity: number;
      movementType: StockMovementType;
      reason?: string;
    }) => inventoryApi.recordMovement(id, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: KEYS.detail(variables.id) });
      qc.invalidateQueries({ queryKey: KEYS.movements(variables.id) });
      qc.invalidateQueries({ queryKey: KEYS.alerts });
      toast.success('Movement recorded');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useNetworkResources() {
  return useQuery({
    queryKey: KEYS.networkResources,
    queryFn: () => inventoryApi.getNetworkResources(),
    select: (res) => res.data ?? [],
  });
}

export function useNetworkFacilities(resourceType: ResourceType, itemName?: string) {
  return useQuery({
    queryKey: KEYS.networkFacilities(resourceType, itemName),
    queryFn: () => inventoryApi.getNetworkFacilities(resourceType, itemName),
    select: (res) => res.data ?? [],
    enabled: !!resourceType,
  });
}

export function useExpiryAlerts() {
  return useQuery({
    queryKey: KEYS.expiryAlerts,
    queryFn: () => inventoryApi.getExpiryAlerts(),
    select: (res) => res.data ?? [],
  });
}

export function useRedistributionOffers() {
  return useQuery({
    queryKey: KEYS.redistributionOffers,
    queryFn: () => inventoryApi.getRedistributionOffers(),
    select: (res) => res.data ?? [],
  });
}

export function useTriggerExpiryCheck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => inventoryApi.triggerExpiryCheck(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      qc.invalidateQueries({ queryKey: KEYS.expiryAlerts });
      qc.invalidateQueries({ queryKey: KEYS.redistributionOffers });
      toast.success('Manual expiry check completed');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useCreateRedistributionOffer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      inventoryId,
      quantity,
      price,
    }: {
      inventoryId: string;
      quantity: number;
      price: number;
    }) => inventoryApi.createRedistributionOffer(inventoryId, { quantity, price }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      qc.invalidateQueries({ queryKey: KEYS.redistributionOffers });
      toast.success('Redistribution offer created successfully');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useClaimRedistributionOffer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (offerId: string) => inventoryApi.claimRedistributionOffer(offerId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all });
      qc.invalidateQueries({ queryKey: KEYS.redistributionOffers });
      qc.invalidateQueries({ queryKey: ['requests'] });
      toast.success('Redistribution offer claimed! Finalize your resource request.');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

