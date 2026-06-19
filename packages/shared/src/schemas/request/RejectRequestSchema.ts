import { z } from 'zod';

export const RejectRequestSchema = z.object({
  reason: z.string().min(1).max(500),
});
