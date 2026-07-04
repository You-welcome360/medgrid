import { z } from 'zod';

export const InitializeTopUpSchema = z.object({
  amount: z.number().positive(),
  callbackUrl: z.string().url(),
  facilityId: z.string().uuid().optional(),
});
