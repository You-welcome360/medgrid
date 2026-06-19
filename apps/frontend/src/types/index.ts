// ============================================================
// Enums (mirrored from @medgrid/shared)
// ============================================================

export type UserRole =
  | 'SUPER_ADMIN'
  | 'FACILITY_ADMIN'
  | 'COORDINATION_MANAGER'
  | 'INVENTORY_MANAGER';

export type UserStatus =
  | 'PENDING_APPROVAL'
  | 'ACTIVE'
  | 'LOCKED'
  | 'SUSPENDED'
  | 'DEACTIVATED';

export type RequestStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'IN_TRANSIT'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REJECTED'
  | 'FAILED';

export type RequestPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type ResourceType = 'BLOOD' | 'PPE' | 'MEDICATION' | 'MEDICAL_EQUIPMENT';

export type InventoryStatus =
  | 'AVAILABLE'
  | 'RESERVED'
  | 'UNAVAILABLE'
  | 'MAINTENANCE'
  | 'EXPIRED'
  | 'DEPLETED';

export type InventoryUnit =
  | 'UNITS'
  | 'TABLETS'
  | 'CAPSULES'
  | 'VIALS'
  | 'BOXES'
  | 'PACKS'
  | 'PIECES'
  | 'BOTTLES';

export type StockMovementType =
  | 'RESTOCK'
  | 'CONSUMPTION'
  | 'ADJUSTMENT'
  | 'EXPIRED_REMOVAL'
  | 'DAMAGE'
  | 'TRANSFER_OUT'
  | 'TRANSFER_IN';

export type FacilityType =
  | 'HOSPITAL'
  | 'PHARMACY'
  | 'BLOOD_BANK'
  | 'PPE_SUPPLIER';

export type FacilityStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export type OnboardingRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

// ============================================================
// Auth
// ============================================================

export interface AuthenticatedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  facilityId: string | null;
  mustChangePassword: boolean;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthenticatedUser;
}

// ============================================================
// User
// ============================================================

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: UserRole;
  status: UserStatus;
  facilityId: string | null;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// Facility
// ============================================================

export interface Facility {
  id: string;
  name: string;
  type: FacilityType;
  status: FacilityStatus;
  phone: string;
  email: string;
  region: string;
  district: string;
  addressLine?: string | null;
  latitude: number;
  longitude: number;
  createdAt: string;
  updatedAt: string;
}

export interface OnboardingRequest {
  id: string;
  facilityName: string;
  facilityType: FacilityType;
  facilityPhone: string;
  facilityEmail: string;
  region: string;
  district: string;
  addressLine?: string | null;
  latitude: number;
  longitude: number;
  adminFirstName: string;
  adminLastName: string;
  adminEmail: string;
  adminPhone?: string | null;
  status: OnboardingRequestStatus;
  rejectionReason?: string | null;
  submittedAt: string;
  reviewedAt?: string | null;
}

// ============================================================
// Inventory
// ============================================================

export interface InventoryItem {
  id: string;
  facilityId: string;
  resourceType: ResourceType;
  itemName: string;
  quantity: number;
  unit: InventoryUnit;
  status: InventoryStatus;
  lowStockThreshold: number | null;
  metadata: Record<string, unknown>;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  inventoryId: string;
  facilityId: string;
  quantity: number;
  movementType: StockMovementType;
  reason: string | null;
  performedById: string;
  referenceId: string | null;
  createdAt: string;
}

export interface LowStockAlert {
  id: string;
  inventoryId: string;
  facilityId: string;
  itemName: string;
  resourceType: string;
  thresholdAtTime: number;
  quantityAtTime: number;
  resolvedAt: string | null;
  createdAt: string;
}

// ============================================================
// Resource Requests
// ============================================================

export interface PatientInfo {
  name: string;
  age: number;
  phone?: string;
  emergencyNotes?: string;
}

export interface ResourceRequest {
  id: string;
  requestingFacilityId: string;
  supplyingFacilityId: string | null;
  requestedById: string;
  handledById: string | null;
  resourceType: ResourceType;
  itemName: string;
  quantity: number;
  unit: InventoryUnit;
  priority: RequestPriority;
  status: RequestStatus;
  description: string;
  patient: PatientInfo | null;
  rejectionReason: string | null;
  cancellationReason: string | null;
  requestedAt: string;
  acceptedAt: string | null;
  dispatchedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
