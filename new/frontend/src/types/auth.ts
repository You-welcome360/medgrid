export type Role = 'SUPER_ADMIN' | 'FACILITY_ADMIN' | 'INVENTORY_MANAGER' | 'COORDINATION_MANAGER';

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  facility_id: string | null;
  is_first_login: boolean;
  facility_type?: 'HOSPITAL' | 'BLOOD_BANK' | 'PHARMACY' | 'SUPPLIER' | null;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export interface ResetPasswordResponse {
  message: string;
  token: string;
}

export interface ChangePasswordResponse {
  message: string;
  token: string;
}

export interface Facility {
  id: string;
  name: string;
  location: string;
  type: 'HOSPITAL' | 'BLOOD_BANK' | 'PHARMACY' | 'SUPPLIER';
  phone: string;
  createdAt: string;
}

export interface CreateFacilityResponse {
  facility: Facility;
  admin: {
    email: string;
    role: string;
    initial_password: string;
  };
}

export interface Manager {
  id: string;
  email: string;
  role: Role;
  isFirstLogin: boolean;
  createdAt: string;
}

export interface CreateManagerResponse {
  manager: {
    id: string;
    email: string;
    role: string;
    facility_id: string;
    initial_password: string;
  };
}
