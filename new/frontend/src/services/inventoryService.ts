import { api } from '@/lib/axios';

export type ResourceType =
  | 'BLOOD'
  | 'DRUG'
  | 'ICU_BED'
  | 'VENTILATOR'
  | 'OXYGEN_CYLINDER'
  | 'OPERATING_THEATRE'
  | 'OTHER_SUPPLY';

export interface InventoryItem {
  id: string;
  facilityId: string;
  resourceType: ResourceType;
  name: string | null;
  bloodGroup: string | null;
  quantity: number | null;
  total: number | null;
  available: number | null;
  price: string | null;
  expiryDate: string | null;
  category: string | null;
  unitMeasure: string | null;
  isMovable: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NetworkResource {
  resourceType: ResourceType;
  name: string | null;
  bloodGroup: string | null;
  isMovable: boolean;
}

// ─── Inventory API Calls ───────────────────────────────────────────────────

export const getFacilityInventory = () =>
  api.get<{ inventory: InventoryItem[] }>('/inventory/facility/inventory').then((r) => r.data);

export const updateBloodStock = (data: {
  bloodGroup: string;
  quantity: number;
  expiryDate: string;
}) => api.put<InventoryItem>('/inventory/facility/inventory/blood', data).then((r) => r.data);

export const updateDrugStock = (data: {
  name: string;
  quantity: number;
  price: number;
  expiryDate: string;
}) => api.put<InventoryItem>('/inventory/facility/inventory/drugs', data).then((r) => r.data);

export const updateIcuBeds = (data: { total: number; available: number }) =>
  api.put<InventoryItem>('/inventory/facility/inventory/icu-beds', data).then((r) => r.data);

export const updateVentilators = (data: { total: number; available: number }) =>
  api.put<InventoryItem>('/inventory/facility/inventory/ventilators', data).then((r) => r.data);

export const updateOxygenCylinders = (data: { total: number; available: number }) =>
  api.put<InventoryItem>('/inventory/facility/inventory/oxygen-cylinders', data).then((r) => r.data);

export const updateOperatingTheatres = (data: { total: number; available: number }) =>
  api.put<InventoryItem>('/inventory/facility/inventory/theatres', data).then((r) => r.data);

export const updateSuppliesStock = (data: {
  name: string;
  quantity: number;
  price: number;
  expiryDate: string;
  category?: string;
  unitMeasure?: string;
}) => api.put<InventoryItem>('/inventory/facility/inventory/supplies', data).then((r) => r.data);

export const getNetworkResources = () =>
  api.get<{ resources: NetworkResource[] }>('/inventory/network/inventory/resources').then((r) => r.data);

export interface ResourceFacility {
  id: string;
  name: string;
  location: string;
  type: string;
  phone: string | null;
}

export interface InventoryItemWithFacility extends InventoryItem {
  facility: ResourceFacility;
}

export const getResourceFacilities = (params: {
  resourceType: string;
  bloodGroup?: string;
  name?: string;
}) =>
  api
    .get<{ facilities: InventoryItemWithFacility[] }>('/inventory/network/inventory/facilities', { params })
    .then((r) => r.data);

export interface FacilityWithInventory extends ResourceFacility {
  inventory: InventoryItem[];
  _count: {
    users: number;
  };
}

export interface AdminReportData {
  stats: {
    totalFacilities: number;
    totalMovableItems: number;
    totalBedCapacity: number;
  };
  facilities: FacilityWithInventory[];
  recentActivity: {
    id: string;
    inventoryItemId: string;
    changedBy: string;
    userEmail: string;
    resourceType: string;
    resourceName: string | null;
    bloodGroup: string | null;
    facilityName: string;
    newValue: any;
    createdAt: string;
  }[];
}

export const getAdminReports = () =>
  api.get<AdminReportData>('/auth/admin/reports').then((r) => r.data);



