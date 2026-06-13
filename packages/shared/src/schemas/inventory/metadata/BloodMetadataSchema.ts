import { z } from 'zod';

export const BloodMetadataSchema = z.object({
  bloodGroup: z.enum([
    'A_POSITIVE',
    'A_NEGATIVE',
    'B_POSITIVE',
    'B_NEGATIVE',
    'AB_POSITIVE',
    'AB_NEGATIVE',
    'O_POSITIVE',
    'O_NEGATIVE',
  ]),

  collectionDate: z.iso.datetime(),

  expiryDate: z.iso.datetime(),
});
