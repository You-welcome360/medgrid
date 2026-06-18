import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import { authRouter } from './modules/auth';
import { errorMiddleware } from './middlewares/error.middleware';

export const createApp = () => {
  const app = express();

  app.use(
    cors({
      origin: 'http://localhost:5173',
      credentials: true,
    })
  );

  app.use(express.json());

  app.use(cookieParser());

  app.use('/auth', authRouter);

  app.use(errorMiddleware);

  return app;
};
