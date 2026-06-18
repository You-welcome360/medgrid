import { Router } from 'express';

import { createRequestController } from './request.controller';

export const requestRouter = Router();

requestRouter.post('/', createRequestController);
