import { z } from 'zod';

import { VALIDATION } from '../../constants';

export const PatientInfoSchema = z.object({
  name: z
    .string()
    .min(VALIDATION.NAME.MIN_LENGTH)
    .max(VALIDATION.NAME.MAX_LENGTH),

  age: z.number().int().positive(),

  phone: z
    .string()
    .min(VALIDATION.NAME.MIN_LENGTH)
    .max(VALIDATION.NAME.MAX_LENGTH)
    .optional(),

  emergencyNotes: z.string().max(VALIDATION.DESCRIPTION.MAX_LENGTH).optional(),
});
