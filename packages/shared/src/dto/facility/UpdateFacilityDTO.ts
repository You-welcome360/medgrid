import { Address, GeoLocation } from '../../types';

export interface UpdateFacilityDTO {
  facilityName?: string;

  address?: Address;

  location?: GeoLocation;

  phone?: string;

  email?: string;
}
