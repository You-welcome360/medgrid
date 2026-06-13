import { z } from 'zod';

export const EquipmentMetadataSchema = z.object({
  manufacturer: z.string(),

  modelNumber: z.string(),

  serialNumber: z.string(),
});
