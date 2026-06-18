import type { NextFunction, Request, Response } from 'express';

import {
  UserRole,
  createAuthenticationError,
  createAuthorizationError,
} from '@medgrid/shared';

import { getMeFromAuthService } from '../clients/auth';

export const requireRole = (...roles: UserRole[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const response = await getMeFromAuthService(
        req.headers.authorization,
        req.headers.cookie
      );

      if (!response.body.success || !response.body.data) {
        return next(createAuthenticationError('Authentication required'));
      }

      const user = response.body.data;

      if (!roles.includes(user.role as UserRole)) {
        return next(createAuthorizationError('Access denied'));
      }

      res.locals.user = user;

      return next();
    } catch (error) {
      return next(error);
    }
  };
};
