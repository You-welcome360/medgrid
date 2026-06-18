import { Router } from 'express';

import { getSystemHealthController } from './system.controller';

export const systemRouter = Router();

systemRouter.get('/health', getSystemHealthController);
