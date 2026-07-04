// ─── Re-export auth types ────────────────────────────────────────────────────
export type { Role, AuthUser, LoginResponse, Facility, Manager } from './auth';

// ─── Coordination ─────────────────────────────────────────────────────────────
export type UrgencyLevel = 'critical' | 'high' | 'medium' | 'low';
export type Classification = 'normal' | 'emergency';
export type RequestStatus = 'open' | 'acknowledged' | 'in_progress' | 'fulfilled' | 'canceled' | 'expired';
export type PaymentStatus = 'pending' | 'paid' | 'failed';

export interface ResourceType {
  id: string;
  name: string;
  type: string;
  default_price: number;
}

export interface CoordinationRequest {
  id: string;
  facility_id: string;
  facility_name?: string;
  resource_type_id: string;
  resource_name: string;
  category?: string;
  quantity: number;
  classification: Classification;
  urgency_level: UrgencyLevel;
  broadcast_radius_km: number | null;
  timeframe_hours: number | null;
  additional_notes: string | null;
  status: RequestStatus;
  acknowledged_by: string | null;
  acknowledged_by_name: string | null;
  acknowledged_at: string | null;
  fulfilled_by: string | null;
  fulfilled_by_name: string | null;
  fulfilled_at: string | null;
  price_per_unit: number | null;
  total_amount: number;
  payment_status: PaymentStatus;
  balance_after?: number;
  expires_at: string | null;
  created_by?: { id: string; email: string };
  created_at: string;
  updated_at?: string;
}

export interface NearbyRequest {
  id: string;
  facility_id: string;
  facility_name: string;
  resource_type_id: string;
  resource_name: string;
  quantity: number;
  urgency_level: UrgencyLevel;
  broadcast_radius_km: number | null;
  distance_km: number;
  status: RequestStatus;
  expires_at: string | null;
  created_at: string;
}

export interface CreateRequestPayload {
  resource_type_id: string;
  quantity: number;
  urgency_level: UrgencyLevel;
  classification: Classification;
  timeframe_hours?: number;
  additional_notes?: string;
  broadcast_radius_km?: number;
}

export interface FulfillRequestPayload {
  responding_facility_id?: string;
  price_per_unit?: number;
  quantity_fulfilled?: number;
}

// ─── Facility / Balance ───────────────────────────────────────────────────────
export interface FacilityBalance {
  facility_id: string;
  facility_name: string;
  balance: number;
}

export type TransactionType = 'topup' | 'deduction';
export type TransactionStatus = 'pending' | 'completed' | 'failed';

export interface BalanceTransaction {
  id: string;
  amount: number;
  type: TransactionType;
  reference: string | null;
  payment_method: string;
  status: TransactionStatus;
  description: string | null;
  created_at: string;
}

export interface TopUpResponse {
  transaction_id: string;
  amount: number;
  payment_url: string;
  reference: string;
}

// ─── Notifications ────────────────────────────────────────────────────────────
export type NotificationType =
  | 'REQUEST_CREATED'
  | 'REQUEST_ACKNOWLEDGED'
  | 'REQUEST_FULFILLED'
  | 'REQUEST_CANCELED'
  | 'REQUEST_EXPIRED'
  | 'BALANCE_LOW'
  | 'BALANCE_TOPUP';

export type NotificationChannel = 'WEBSOCKET' | 'PUSH' | 'EMAIL';

export interface Notification {
  id: string;
  type: NotificationType;
  channel: NotificationChannel;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
}

export interface NotificationPreference {
  channel: string;
  enabled: boolean;
  emergency_only: boolean;
}
