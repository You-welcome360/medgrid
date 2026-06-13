import { z } from 'zod';

export const PPEMetadataSchema = z.object({
  size: z.string(),

  manufacturer: z.string(),

  modelNumber: z.string().optional(),
});
