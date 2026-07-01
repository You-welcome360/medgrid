import { api } from './client';
import type {
  InventoryItem,
  StockMovement,
  LowStockAlert,
  InventoryStatus,
  ResourceType,
  StockMovementType,
  InventoryUnit,
  NetworkFacilityItem,
} from '@/types';

export const inventoryApi = {
  list: (params?: {
    resourceType?: ResourceType;
    status?: InventoryStatus;
  }) => {
    const query = new URLSearchParams();
    if (params?.resourceType) query.set('resourceType', params.resourceType);
    if (params?.status) query.set('status', params.status);
    const qs = query.toString();
    return api.get<InventoryItem[]>(`/inventory${qs ? `?${qs}` : ''}`);
  },

  get: (id: string) => api.get<InventoryItem>(`/inventory/${id}`),

  getAvailable: (facilityId: string, resourceType?: ResourceType) => {
    const query = new URLSearchParams();
    query.set('facilityId', facilityId);
    if (resourceType) query.set('resourceType', resourceType);
    return api.get<InventoryItem[]>(`/inventory/available?${query.toString()}`);
  },

  create: (data: {
    resourceType: ResourceType;
    itemName: string;
    unit: InventoryUnit;
    metadata: Record<string, unknown>;
    price?: number;
    isMovable?: boolean;
  }) => api.post<InventoryItem>('/inventory', data),

  updateStatus: (id: string, status: InventoryStatus) =>
    api.patch<InventoryItem>(`/inventory/${id}/status`, { status }),

  setThreshold: (id: string, threshold: number) =>
    api.patch<InventoryItem>(`/inventory/${id}/threshold`, { threshold }),

  setReservedThreshold: (id: string, threshold: number) =>
    api.patch<InventoryItem>(`/inventory/${id}/reserved-threshold`, {
      threshold,
    }),

  delete: (id: string) => api.delete<null>(`/inventory/${id}`),

  getMovements: (id: string) =>
    api.get<StockMovement[]>(`/inventory/${id}/movements`),

  recordMovement: (
    id: string,
    data: {
      quantity: number;
      movementType: StockMovementType;
      reason?: string;
      referenceId?: string;
    }
  ) => api.post<StockMovement>(`/inventory/${id}/movements`, data),

  getActiveAlerts: () => api.get<LowStockAlert[]>('/inventory/alerts/active'),

  getAlertsByItem: (id: string) =>
    api.get<LowStockAlert[]>(`/inventory/${id}/alerts`),

  getNetworkResources: () =>
    api.get<Array<{ resourceType: ResourceType; itemName: string; isMovable: boolean }>>(
      '/inventory/network/resources'
    ),

  getNetworkFacilities: (resourceType: ResourceType, itemName?: string) => {
    const query = new URLSearchParams();
    query.set('resourceType', resourceType);
    if (itemName) query.set('itemName', itemName);
    return api.get<NetworkFacilityItem[]>(`/inventory/network/facilities?${query.toString()}`);
  },
};

