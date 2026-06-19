import { Router } from 'express';

import {
  createInventoryController,
  getInventoryController,
  getInventoryItemController,
  updateInventoryStatusController,
  deleteInventoryController,
  setThresholdController,
  createStockMovementController,
  getStockMovementsController,
  getActiveAlertsController,
  getAlertsByInventoryController,
} from './inventory.controller';

export const inventoryRouter = Router();

// Inventory CRUD
inventoryRouter.post('/', createInventoryController);
inventoryRouter.get('/', getInventoryController);

// NOTE: /alerts/active must be declared before /:id to prevent Express
// from treating "alerts" as an :id param
inventoryRouter.get('/alerts/active', getActiveAlertsController);

inventoryRouter.get('/:id', getInventoryItemController);
inventoryRouter.patch('/:id/status', updateInventoryStatusController);
inventoryRouter.delete('/:id', deleteInventoryController);

// Threshold
inventoryRouter.patch('/:id/threshold', setThresholdController);

// Stock Movements
inventoryRouter.post('/:id/movements', createStockMovementController);
inventoryRouter.get('/:id/movements', getStockMovementsController);

// Alert history per item
inventoryRouter.get('/:id/alerts', getAlertsByInventoryController);
