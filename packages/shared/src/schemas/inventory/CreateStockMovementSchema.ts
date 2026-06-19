import { z } from 'zod';

import { StockMovementType } from '../../enums';

export const CreateStockMovementSchema = z.object({
  quantity: z
    .number()
    .int()
    .refine((val) => val !== 0, {
      message: 'Quantity must be non-zero',
    }),

  movementType: z.enum(StockMovementType),

  reason: z.string().max(500).optional(),

  referenceId: z.string().uuid().optional(),
});
