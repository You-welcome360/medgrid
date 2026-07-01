import { Router } from 'express';

import {
  loginController,
  logoutController,
  meController,
  refreshController,
  changePasswordController,
} from './auth.controller';
import { loginRateLimiter } from '../../middlewares/rate-limiter.middleware';

export const authRouter = Router();

authRouter.post('/login', loginRateLimiter, loginController);
authRouter.post('/refresh', refreshController);
authRouter.post('/logout', logoutController);
authRouter.get('/me', meController);
authRouter.patch('/change-password', changePasswordController);
