import express from 'express';
import cors from 'cors';

import { healthRouter } from './routes/health.route';
import { facilityRouter } from './modules/facilities';
import { inventoryRouter } from './modules/inventory';
import { onboardingRouter } from './modules/onboarding';

export const createApp = () => {
  const app = express();

  app.use(
    cors({
      origin: 'http://localhost:5173',
    })
  );

  app.use(express.json());

  app.use('/health', healthRouter);

  app.use('/facilities', facilityRouter);

  app.use('/inventory', inventoryRouter);

  app.use('/onboarding-requests', onboardingRouter);

  return app;
};
