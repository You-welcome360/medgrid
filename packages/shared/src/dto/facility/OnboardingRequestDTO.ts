import { FacilityType } from '../../enums';

export interface OnboardingRequestDTO {
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

  status: string;

  rejectionReason?: string | null;

  submittedAt: string;

  reviewedAt?: string | null;
}
