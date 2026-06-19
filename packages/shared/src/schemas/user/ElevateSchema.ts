import { z } from 'zod';

export const ElevateSchema = z.object({
  password: z.string().min(1),

  targetFacilityId: z.string().uuid(),
});
