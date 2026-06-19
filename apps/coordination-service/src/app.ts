import express from 'express';
import cors from 'cors';

import { healthRouter } from './routes/health.route';
import { requestRouter } from './modules/requests';
import { errorMiddleware } from './middlewares/error.middleware';

export const createApp = () => {
  const app = express();

  app.use(
    cors({
      origin: 'http://localhost:5173',
    })
  );

  app.use(express.json());

  app.use('/health', healthRouter);

  app.use('/requests', requestRouter);

  app.use(errorMiddleware);

  return app;
};
