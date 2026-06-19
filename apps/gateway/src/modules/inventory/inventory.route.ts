import { Router } from 'express';

import { UserRole } from '@medgrid/shared';

import { requireRole } from '../../middlewares/require-role.middleware';

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

const inventoryAccess = requireRole(
  UserRole.INVENTORY_MANAGER,
  UserRole.FACILITY_ADMIN
);

// Inventory CRUD
inventoryRouter.post('/', inventoryAccess, createInventoryController);
inventoryRouter.get('/', inventoryAccess, getInventoryController);

// NOTE: /alerts/active must be declared before /:id to prevent Express
// from treating "alerts" as an :id param
inventoryRouter.get(
  '/alerts/active',
  inventoryAccess,
  getActiveAlertsController
);

inventoryRouter.get('/:id', inventoryAccess, getInventoryItemController);
inventoryRouter.patch(
  '/:id/status',
  inventoryAccess,
  updateInventoryStatusController
);
inventoryRouter.delete('/:id', inventoryAccess, deleteInventoryController);

// Threshold
inventoryRouter.patch(
  '/:id/threshold',
  inventoryAccess,
  setThresholdController
);

// Stock Movements
inventoryRouter.post(
  '/:id/movements',
  inventoryAccess,
  createStockMovementController
);
inventoryRouter.get(
  '/:id/movements',
  inventoryAccess,
  getStockMovementsController
);

// Alert history per item
inventoryRouter.get(
  '/:id/alerts',
  inventoryAccess,
  getAlertsByInventoryController
);
