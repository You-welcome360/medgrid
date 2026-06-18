import { Router } from 'express';

import type { ApiResponse } from '@medgrid/shared';

export const healthRouter = Router();

type HealthData = {
  status: string;
};

healthRouter.get('/', (_req, res) => {
  const response: ApiResponse<HealthData> = {
    success: true,
    message: 'Coordination Service is healthy',
    data: {
      status: 'ok',
    },
    timestamp: new Date().toISOString(),
  };

  return res.status(200).json(response);
});
