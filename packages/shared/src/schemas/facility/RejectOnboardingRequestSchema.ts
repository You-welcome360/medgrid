import { z } from 'zod';

export const RejectOnboardingRequestSchema = z.object({
  reason: z.string().min(1).max(500),
});
