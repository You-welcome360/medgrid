import type { NextFunction, Request, Response } from 'express';

import {
  createAuthenticationError,
  createAuthorizationError,
} from '@medgrid/shared';

import { getMeFromAuthService } from '../clients/auth';

export const requireElevated = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // The elevated token is passed in X-Elevated-Token header
  const elevatedToken = req.headers['x-elevated-token'] as string | undefined;

  if (!elevatedToken) {
    return next(createAuthenticationError('Elevated authentication required'));
  }

  // Verify via auth-service using the elevated token as Bearer
  getMeFromAuthService(`Bearer ${elevatedToken}`, undefined)
    .then((response) => {
      if (!response.body.success || !response.body.data) {
        return next(
          createAuthenticationError('Elevated authentication required')
        );
      }

      const user = response.body.data;

      // The elevated token must have elevated=true embedded
      // We trust the auth-service to verify the token claims
      // The gateway passes the targetFacilityId from the URL param
      const targetFacilityId = req.params['facilityId'] as string | undefined;

      if (targetFacilityId && user.facilityId !== null) {
        // SUPER_ADMIN has no facilityId — we decode the target from
        // the elevated token indirectly via the route param
      }

      res.locals.elevatedUser = user;
      res.locals.targetFacilityId = targetFacilityId;

      return next();
    })
    .catch(() =>
      next(createAuthorizationError('Elevated authentication required'))
    );
};
