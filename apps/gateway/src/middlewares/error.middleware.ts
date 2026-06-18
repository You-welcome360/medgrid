import type { NextFunction, Request, Response } from 'express';

import type { ApiResponse, AppError } from '@medgrid/shared';

export const errorMiddleware = (
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (
    typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    'message' in error
  ) {
    const appError = error as AppError;

    const response: ApiResponse<null> = {
      success: false,
      message: appError.message,
      timestamp: new Date().toISOString(),
    };

    return res.status(appError.statusCode).json(response);
  }

  const response: ApiResponse<null> = {
    success: false,
    message: 'Internal server error',
    timestamp: new Date().toISOString(),
  };

  return res.status(500).json(response);
};
