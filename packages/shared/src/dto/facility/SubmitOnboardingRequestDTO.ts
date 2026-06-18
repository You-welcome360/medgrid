import { FacilityType } from '../../enums';
import { Address, GeoLocation } from '../../types';

export interface SubmitOnboardingRequestDTO {
  facilityName: string;

  facilityType: FacilityType;

  facilityPhone: string;

  facilityEmail: string;

  address: Address;

  location: GeoLocation;

  adminFirstName: string;

  adminLastName: string;

  adminEmail: string;

  adminPhone?: string;
}
