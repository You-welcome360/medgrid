import { createNotFoundError } from '@medgrid/shared';
import type { Facility } from '@medgrid/database/src/generated/prisma/client';

import { findAllFacilities, findFacilityById } from './facility.repository';

const toFacilityDTO = (facility: Facility) => ({
  id: facility.id,
  name: facility.name,
  type: facility.type,
  status: facility.status,
  phone: facility.phone,
  email: facility.email,
  region: facility.region,
  district: facility.district,
  addressLine: facility.addressLine,
  latitude: facility.latitude,
  longitude: facility.longitude,
  createdAt: facility.createdAt.toISOString(),
  updatedAt: facility.updatedAt.toISOString(),
});

export const getAllFacilities = async () => {
  const facilities = await findAllFacilities();
  return facilities.map(toFacilityDTO);
};

export const getFacilityById = async (id: string) => {
  const facility = await findFacilityById(id);

  if (!facility) {
    throw createNotFoundError('Facility not found');
  }

  return toFacilityDTO(facility);
};

// Legacy stub — kept to avoid breaking the existing route
export const createFacility = async () => {
  return { facilityId: 'facility-123' };
};
