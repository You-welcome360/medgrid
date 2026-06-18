import type { NextFunction, Request, Response } from 'express';

import { createNotFoundError } from '@medgrid/shared';

export const notFoundMiddleware = (
  _req: Request,
  _res: Response,
  next: NextFunction
) => {
  return next(createNotFoundError('Route not found'));
};
