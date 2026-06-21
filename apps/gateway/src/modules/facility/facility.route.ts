import { Router } from 'express';

import { UserRole } from '@medgrid/shared';

import { requireRole } from '../../middlewares/require-role.middleware';
import {
  createFacilityController,
  getAllFacilitiesController,
  getFacilityByIdController,
} from './facility.controller';

export const facilityRouter = Router();

const canRead = requireRole(
  UserRole.SUPER_ADMIN,
  UserRole.FACILITY_ADMIN,
  UserRole.COORDINATION_MANAGER,
  UserRole.INVENTORY_MANAGER
);

facilityRouter.get('/', canRead, getAllFacilitiesController);
facilityRouter.get('/:id', canRead, getFacilityByIdController);
facilityRouter.post('/', createFacilityController);
