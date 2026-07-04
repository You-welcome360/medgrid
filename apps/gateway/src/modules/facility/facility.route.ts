import { Router } from 'express';

import { UserRole } from '@medgrid/shared';

import { requireRole } from '../../middlewares/require-role.middleware';
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

const canRead = requireRole(
  UserRole.SUPER_ADMIN,
  UserRole.FACILITY_ADMIN,
  UserRole.COORDINATION_MANAGER,
  UserRole.INVENTORY_MANAGER
);

const canWrite = requireRole(UserRole.SUPER_ADMIN, UserRole.FACILITY_ADMIN);

facilityRouter.get('/', canRead, getAllFacilitiesController);

facilityRouter.get('/balance', canRead, getFacilityBalanceController);
facilityRouter.post('/balance/top-up', canRead, initializeFacilityTopUpController);
facilityRouter.get('/balance/history', canRead, getFacilityBalanceHistoryController);
facilityRouter.post('/webhooks/paystack', paystackWebhookController);

facilityRouter.get('/:id', canRead, getFacilityByIdController);
facilityRouter.post('/', createFacilityController);
facilityRouter.patch('/:id', canWrite, updateFacilityController);
