import { z } from 'zod';

export const SetThresholdSchema = z.object({
  threshold: z.number().int().min(0),
});
