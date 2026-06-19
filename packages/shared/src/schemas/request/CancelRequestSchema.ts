import { z } from 'zod';

export const CancelRequestSchema = z.object({
  reason: z.string().min(1).max(500),
});
