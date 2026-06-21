import { Router } from 'express';

import {
  createFacilityController,
  getAllFacilitiesController,
  getFacilityByIdController,
} from './facility.controller';

export const facilityRouter = Router();

facilityRouter.post('/', createFacilityController);
facilityRouter.get('/', getAllFacilitiesController);
facilityRouter.get('/:id', getFacilityByIdController);
