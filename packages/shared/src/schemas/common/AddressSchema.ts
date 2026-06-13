import { z } from 'zod';

export const AddressSchema = z.object({
  region: z.string().min(2).max(100),

  district: z.string().min(2).max(100),

  addressLine: z.string().max(255).optional(),
});
