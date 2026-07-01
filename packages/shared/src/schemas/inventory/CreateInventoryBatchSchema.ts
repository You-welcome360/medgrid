import { z } from 'zod';

import { InventoryUnit, ResourceType } from '../../enums';

import { VALIDATION } from '../../constants';

import {
  BloodMetadataSchema,
  MedicationMetadataSchema,
  PPEMetadataSchema,
  EquipmentMetadataSchema,
} from './metadata';

const InventoryItemNameSchema = z
  .string()
  .min(VALIDATION.INVENTORY_ITEM_NAME.MIN_LENGTH)
  .max(VALIDATION.INVENTORY_ITEM_NAME.MAX_LENGTH);

const BloodInventorySchema = z.object({
  resourceType: z.literal(ResourceType.BLOOD),

  itemName: InventoryItemNameSchema,

  unit: z.enum(InventoryUnit),

  metadata: BloodMetadataSchema,

  price: z.number().min(0).optional(),

  isMovable: z.boolean().optional(),
});

const MedicationInventorySchema = z.object({
  resourceType: z.literal(ResourceType.MEDICATION),

  itemName: InventoryItemNameSchema,

  unit: z.enum(InventoryUnit),

  metadata: MedicationMetadataSchema,

  price: z.number().min(0).optional(),

  isMovable: z.boolean().optional(),
});

const PPEInventorySchema = z.object({
  resourceType: z.literal(ResourceType.PPE),

  itemName: InventoryItemNameSchema,

  unit: z.enum(InventoryUnit),

  metadata: PPEMetadataSchema,

  price: z.number().min(0).optional(),

  isMovable: z.boolean().optional(),
});

const EquipmentInventorySchema = z.object({
  resourceType: z.literal(ResourceType.MEDICAL_EQUIPMENT),

  itemName: InventoryItemNameSchema,

  unit: z.enum(InventoryUnit),

  metadata: EquipmentMetadataSchema,

  price: z.number().min(0).optional(),

  isMovable: z.boolean().optional(),
});


export const CreateInventoryBatchSchema = z.discriminatedUnion('resourceType', [
  BloodInventorySchema,
  MedicationInventorySchema,
  PPEInventorySchema,
  EquipmentInventorySchema,
]);
