import express from 'express';
import cors from 'cors';

import { authRouter } from './modules/auth';
import { facilityRouter } from './modules/facility';
import { healthRouter } from './modules/health';
import { inventoryRouter } from './modules/inventory';
import { requestRouter } from './modules/request';
import { onboardingRouter } from './modules/onboarding';
import { usersRouter } from './modules/users';
import { auditRouter } from './modules/audit';
import { errorMiddleware } from './middlewares/error.middleware';
import { notFoundMiddleware } from './middlewares/not-found.middleware';
import { requestLoggerMiddleware } from './middlewares/request-logger.middleware';
import { systemRouter } from './modules/system';

export const createApp = () => {
  const app = express();

  app.use(
    cors({
      origin: 'http://localhost:5173',
      credentials: true,
    })
  );

  app.use(express.json());

  app.use(requestLoggerMiddleware);

  app.use('/api/v1/health', healthRouter);

  app.use('/api/v1/system', systemRouter);

  app.use('/api/v1/auth', authRouter);

  app.use('/api/v1/facilities', facilityRouter);

  app.use('/api/v1/inventory', inventoryRouter);

  app.use('/api/v1/requests', requestRouter);

  app.use('/api/v1/onboarding-requests', onboardingRouter);

  app.use('/api/v1/users', usersRouter);

  app.use('/api/v1/audit-logs', auditRouter);

  app.post('/api/v1/internal/broadcast', (req, res) => {
    const secret = req.headers['x-internal-secret'];
    const expectedSecret = process.env.INTERNAL_SERVICE_SECRET || 'super_secret';

    if (secret !== expectedSecret) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { event, room, data } = req.body;
    if (!event || !room || data === undefined) {
      return res.status(400).json({ success: false, message: 'Invalid payload' });
    }

    const { emitToRoom } = require('./socket');
    emitToRoom(room, event, data);

    return res.status(200).json({ success: true });
  });

  app.use(notFoundMiddleware);

  app.use(errorMiddleware);


  return app;
};




