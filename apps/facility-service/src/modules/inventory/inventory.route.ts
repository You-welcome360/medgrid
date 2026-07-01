import { Router } from 'express';

import {
  createInventoryController,
  getInventoryController,
  getAvailableInventoryController,
  getInventoryItemController,
  updateInventoryStatusController,
  deleteInventoryController,
  setThresholdController,
  setReservedThresholdController,
  createStockMovementController,
  getStockMovementsController,
  getActiveAlertsController,
  getAlertsByInventoryController,
  getNetworkResourcesController,
  getNetworkFacilitiesController,
} from './inventory.controller';

export const inventoryRouter = Router();

// Inventory CRUD
inventoryRouter.post('/', createInventoryController);
inventoryRouter.get('/', getInventoryController);

// NOTE: static paths must come before /:id
inventoryRouter.get('/alerts/active', getActiveAlertsController);
inventoryRouter.get('/available', getAvailableInventoryController);
inventoryRouter.get('/network/resources', getNetworkResourcesController);
inventoryRouter.get('/network/facilities', getNetworkFacilitiesController);

inventoryRouter.get('/:id', getInventoryItemController);
inventoryRouter.patch('/:id/status', updateInventoryStatusController);
inventoryRouter.delete('/:id', deleteInventoryController);

// Threshold
inventoryRouter.patch('/:id/threshold', setThresholdController);
inventoryRouter.patch(
  '/:id/reserved-threshold',
  setReservedThresholdController
);

// Stock Movements
inventoryRouter.post('/:id/movements', createStockMovementController);
inventoryRouter.get('/:id/movements', getStockMovementsController);

// Alert history per item
inventoryRouter.get('/:id/alerts', getAlertsByInventoryController);
