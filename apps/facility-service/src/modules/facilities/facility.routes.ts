import { Router } from 'express';

import {
  createFacilityController,
  getAllFacilitiesController,
  getFacilityByIdController,
  updateFacilityController,
  getFacilityBalanceController,
  initializeFacilityTopUpController,
  getFacilityBalanceHistoryController,
  paystackWebhookController,
} from './facility.controller';

export const facilityRouter = Router();

facilityRouter.post('/', createFacilityController);
facilityRouter.get('/', getAllFacilitiesController);

facilityRouter.get('/balance', getFacilityBalanceController);
facilityRouter.post('/balance/top-up', initializeFacilityTopUpController);
facilityRouter.get('/balance/history', getFacilityBalanceHistoryController);
facilityRouter.post('/webhooks/paystack', paystackWebhookController);

facilityRouter.get('/:id', getFacilityByIdController);
facilityRouter.patch('/:id', updateFacilityController);
