import type { NextFunction, Request, Response } from 'express';

export const requestLoggerMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);

  next();
};
