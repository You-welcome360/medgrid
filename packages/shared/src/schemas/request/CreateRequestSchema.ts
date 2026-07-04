import { z } from 'zod';

import { InventoryUnit, RequestPriority, ResourceType } from '../../enums';

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
  supplyingFacilityId: z.string().uuid().optional(),

  resourceType: z.enum(ResourceType),

  itemName: RequestItemNameSchema,

  quantity: z.number().int().positive(),

  unit: z.enum(InventoryUnit),

  priority: z.enum(RequestPriority),

  description: RequestDescriptionSchema,

  patient: PatientInfoSchema.optional(),

  isEmergency: z.boolean().optional(),

  isBroadcast: z.boolean().optional(),

  maxRadiusKm: z.number().int().positive().optional(),

  pricePerUnit: z.number().positive().optional(),

  expiresAt: z.string().datetime().optional(),
}).refine(data => {
  if (!data.isBroadcast && !data.supplyingFacilityId) {
    return false;
  }
  return true;
}, {
  message: "supplyingFacilityId is required when request is not a broadcast",
  path: ["supplyingFacilityId"]
});
