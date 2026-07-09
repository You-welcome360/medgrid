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
import { notificationsRouter } from './modules/notifications/notifications.route';
import { errorMiddleware } from './middlewares/error.middleware';
import { notFoundMiddleware } from './middlewares/not-found.middleware';
import { requestLoggerMiddleware } from './middlewares/request-logger.middleware';
import { systemRouter } from './modules/system';

export const createApp = () => {
  const app = express();

  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:5173'];

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);

        const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
        const isNgrok =
          origin.endsWith('.ngrok-free.dev') ||
          origin.endsWith('.ngrok-free.app') ||
          origin.endsWith('.loca.lt');
        const isLocalIp =
          origin.startsWith('http://localhost') ||
          origin.startsWith('http://127.0.0.1') ||
          /^https?:\/\/(192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})(:\d+)?$/.test(origin);

        if (
          allowedOrigins.includes(origin) ||
          (isDevelopment && (isNgrok || isLocalIp))
        ) {
          callback(null, true);
        } else {
          callback(new Error(`Origin ${origin} not allowed by CORS`));
        }
      },
      credentials: true,
    })
  );

  app.use(
    express.json({
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    })
  );

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
  app.use('/api/v1/notifications', notificationsRouter);

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




