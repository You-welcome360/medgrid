import { createNotFoundError, type UpdateFacilityDTO } from '@medgrid/shared';
import type { Facility } from '@medgrid/database/src/generated/prisma/client';

import {
  findAllFacilities,
  findFacilityById,
  updateFacility as dbUpdateFacility,
} from './facility.repository';

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

export const updateFacility = async (id: string, dto: UpdateFacilityDTO) => {
  await getFacilityById(id); // throws if not exists

  const updateInput: any = {};
  if (dto.facilityName) updateInput.name = dto.facilityName;
  if (dto.phone) updateInput.phone = dto.phone;
  if (dto.email) updateInput.email = dto.email;

  if (dto.address) {
    if (dto.address.region) updateInput.region = dto.address.region;
    if (dto.address.district) updateInput.district = dto.address.district;
    if (dto.address.addressLine !== undefined) updateInput.addressLine = dto.address.addressLine;
  }

  if (dto.location) {
    if (dto.location.latitude !== undefined) updateInput.latitude = dto.location.latitude;
    if (dto.location.longitude !== undefined) updateInput.longitude = dto.location.longitude;
  }

  const updated = await dbUpdateFacility(id, updateInput);
  return toFacilityDTO(updated);
};

