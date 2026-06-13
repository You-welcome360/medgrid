import express from 'express';

import { healthRouter } from './routes/health.route';

export const createApp = () => {
  const app = express();

  app.use(express.json());

  app.use('/health', healthRouter);

  return app;
};
