import { z } from 'zod';

import { FacilityType } from '../../enums';
import { VALIDATION } from '../../constants';
import { AddressSchema, GeoLocationSchema } from '../common';

export const CreateFacilitySchema = z.object({
  facilityName: z
    .string()
    .min(VALIDATION.FACILITY_NAME.MIN_LENGTH)
    .max(VALIDATION.FACILITY_NAME.MAX_LENGTH),

  facilityType: z.enum(FacilityType),

  address: AddressSchema,

  location: GeoLocationSchema,

  phone: z
    .string()
    .min(VALIDATION.PHONE.MIN_LENGTH)
    .max(VALIDATION.PHONE.MAX_LENGTH),

  email: z.email().max(VALIDATION.EMAIL.MAX_LENGTH),

  facilityAdminName: z
    .string()
    .min(VALIDATION.NAME.MIN_LENGTH)
    .max(VALIDATION.NAME.MAX_LENGTH),

  facilityAdminEmail: z.email().max(VALIDATION.EMAIL.MAX_LENGTH),

  facilityAdminPassword: z
    .string()
    .min(VALIDATION.PASSWORD.MIN_LENGTH)
    .max(VALIDATION.PASSWORD.MAX_LENGTH)
    .regex(
      VALIDATION.PASSWORD.REGEX,
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    ),
});
