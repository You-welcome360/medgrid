import { Address, GeoLocation } from '../../types';

import { FacilityType } from '../../enums';

export interface CreateFacilityDTO {
  facilityName: string;

  facilityType: FacilityType;

  address: Address;

  location: GeoLocation;

  phone: string;

  email: string;

  facilityAdminName: string;

  facilityAdminEmail: string;

  facilityAdminPassword: string;
}
