import { z } from 'zod';

import { InventoryStatus } from '../../enums';

export const UpdateInventoryStatusSchema = z.object({
  status: z.enum(InventoryStatus),
});
