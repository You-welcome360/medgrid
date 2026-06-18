import { z } from 'zod';

import { FacilityType } from '../../enums';
import { VALIDATION } from '../../constants';
import { AddressSchema, GeoLocationSchema } from '../common';

export const SubmitOnboardingRequestSchema = z.object({
  facilityName: z
    .string()
    .min(VALIDATION.FACILITY_NAME.MIN_LENGTH)
    .max(VALIDATION.FACILITY_NAME.MAX_LENGTH),

  facilityType: z.enum(FacilityType),

  facilityPhone: z
    .string()
    .min(VALIDATION.PHONE.MIN_LENGTH)
    .max(VALIDATION.PHONE.MAX_LENGTH),

  facilityEmail: z.email().max(VALIDATION.EMAIL.MAX_LENGTH),

  address: AddressSchema,

  location: GeoLocationSchema,

  adminFirstName: z
    .string()
    .min(VALIDATION.NAME.MIN_LENGTH)
    .max(VALIDATION.NAME.MAX_LENGTH),

  adminLastName: z
    .string()
    .min(VALIDATION.NAME.MIN_LENGTH)
    .max(VALIDATION.NAME.MAX_LENGTH),

  adminEmail: z.email().max(VALIDATION.EMAIL.MAX_LENGTH),

  adminPhone: z
    .string()
    .min(VALIDATION.PHONE.MIN_LENGTH)
    .max(VALIDATION.PHONE.MAX_LENGTH)
    .optional(),
});
