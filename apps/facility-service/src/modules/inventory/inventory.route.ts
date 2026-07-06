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
  setPriceController,
  createStockMovementController,
  getStockMovementsController,
  getActiveAlertsController,
  getAlertsByInventoryController,
  getNetworkResourcesController,
  getNetworkFacilitiesController,
  manualExpiryCheckController,
  getExpiryAlertsController,
  getRedistributionOffersController,
  createRedistributionOfferController,
  claimRedistributionOfferController,
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

// Expiry & Redistribution static paths
inventoryRouter.post('/expiry/check', manualExpiryCheckController);
inventoryRouter.get('/alerts/expiry', getExpiryAlertsController);
inventoryRouter.get('/redistribution/offers', getRedistributionOffersController);
inventoryRouter.post('/redistribution/offers/:offerId/claim', claimRedistributionOfferController);

inventoryRouter.get('/:id', getInventoryItemController);
inventoryRouter.patch('/:id/status', updateInventoryStatusController);
inventoryRouter.delete('/:id', deleteInventoryController);

// Threshold
inventoryRouter.patch('/:id/threshold', setThresholdController);
inventoryRouter.patch(
  '/:id/reserved-threshold',
  setReservedThresholdController
);
inventoryRouter.patch('/:id/price', setPriceController);

// Stock Movements
inventoryRouter.post('/:id/movements', createStockMovementController);
inventoryRouter.get('/:id/movements', getStockMovementsController);

// Alert history per item
inventoryRouter.get('/:id/alerts', getAlertsByInventoryController);

// Manual redistribution offers creation
inventoryRouter.post('/:id/redistribution/offers', createRedistributionOfferController);
