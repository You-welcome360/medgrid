import { Router } from 'express';

import { createInventoryBatchController } from './inventory.controller';

export const inventoryRouter = Router();

inventoryRouter.post('/', createInventoryBatchController);
