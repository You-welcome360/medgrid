import { Router } from 'express';

import {
  loginController,
  logoutController,
  meController,
  refreshController,
  changePasswordController,
} from './auth.controller';

export const authRouter = Router();

authRouter.post('/login', loginController);
authRouter.post('/refresh', refreshController);
authRouter.post('/logout', logoutController);
authRouter.get('/me', meController);
authRouter.patch('/change-password', changePasswordController);
