import { Router } from 'express';

import { UserRole } from '@medgrid/shared';

import { requireRole } from '../../middlewares/require-role.middleware';

import {
  createInventoryController,
  getInventoryController,
  getAvailableInventoryController,
  getInventoryItemController,
  updateInventoryStatusController,
  deleteInventoryController,
  setThresholdController,
  setReservedThresholdController,
  setPriceController,
  createStockMovementController,
  getStockMovementsController,
  getActiveAlertsController,
  getAlertsByInventoryController,
  getNetworkResourcesController,
  getNetworkFacilitiesController,
} from './inventory.controller';

export const inventoryRouter = Router();

const inventoryAccess = requireRole(
  UserRole.INVENTORY_MANAGER,
  UserRole.FACILITY_ADMIN
);

const anyAuthenticated = requireRole(
  UserRole.SUPER_ADMIN,
  UserRole.FACILITY_ADMIN,
  UserRole.COORDINATION_MANAGER,
  UserRole.INVENTORY_MANAGER
);

// Inventory CRUD
inventoryRouter.post('/', inventoryAccess, createInventoryController);
inventoryRouter.get('/', inventoryAccess, getInventoryController);

// NOTE: static paths must come before /:id
inventoryRouter.get(
  '/alerts/active',
  inventoryAccess,
  getActiveAlertsController
);
inventoryRouter.get(
  '/available',
  anyAuthenticated,
  getAvailableInventoryController
);
inventoryRouter.get(
  '/network/resources',
  anyAuthenticated,
  getNetworkResourcesController
);
inventoryRouter.get(
  '/network/facilities',
  anyAuthenticated,
  getNetworkFacilitiesController
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

inventoryRouter.patch(
  '/:id/reserved-threshold',
  inventoryAccess,
  setReservedThresholdController
);

inventoryRouter.patch(
  '/:id/price',
  inventoryAccess,
  setPriceController
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
