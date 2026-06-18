import { Router } from 'express';

import { createFacilityController } from './facility.controller';

export const facilityRouter = Router();

facilityRouter.post('/', createFacilityController);
