import express from 'express';
import cors from 'cors';

import { healthRouter } from './routes/health.route';

export const createApp = () => {
  const app = express();

  app.use(
    cors({
      origin: 'http://localhost:5173',
    })
  );

  app.use(express.json());

  app.use('/health', healthRouter);

  return app;
};
