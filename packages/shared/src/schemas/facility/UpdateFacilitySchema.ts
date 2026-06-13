import { z } from 'zod';

import { VALIDATION } from '../../constants';
import { AddressSchema, GeoLocationSchema } from '../common';

export const UpdateFacilitySchema = z.object({
  facilityName: z
    .string()
    .min(VALIDATION.FACILITY_NAME.MIN_LENGTH)
    .max(VALIDATION.FACILITY_NAME.MAX_LENGTH)
    .optional(),

  address: AddressSchema.optional(),

  location: GeoLocationSchema.optional(),

  phone: z
    .string()
    .min(VALIDATION.PHONE.MIN_LENGTH)
    .max(VALIDATION.PHONE.MAX_LENGTH)
    .optional(),

  email: z.email().max(VALIDATION.EMAIL.MAX_LENGTH).optional(),
});
