import { z } from 'zod';

import { ResourceType } from '../../enums';

import { VALIDATION } from '../../constants';

import { PatientInfoSchema } from '../common';

const RequestItemNameSchema = z
  .string()
  .min(VALIDATION.INVENTORY_ITEM_NAME.MIN_LENGTH)
  .max(VALIDATION.INVENTORY_ITEM_NAME.MAX_LENGTH);

const RequestDescriptionSchema = z
  .string()
  .min(VALIDATION.DESCRIPTION.MIN_LENGTH)
  .max(VALIDATION.DESCRIPTION.MAX_LENGTH);

export const CreateRequestSchema = z.object({
  resourceType: z.enum(ResourceType),

  itemName: RequestItemNameSchema,

  quantity: z.number().positive(),

  description: RequestDescriptionSchema,

  patient: PatientInfoSchema.optional(),
});
