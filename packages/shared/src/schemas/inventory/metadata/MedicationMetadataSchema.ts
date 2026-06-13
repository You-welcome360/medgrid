import { z } from 'zod';

export const MedicationMetadataSchema = z.object({
  dosageForm: z.string(),

  strength: z.string(),

  manufacturer: z.string(),

  batchNumber: z.string(),

  expiryDate: z.iso.datetime(),
});
