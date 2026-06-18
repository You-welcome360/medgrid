import type { NextFunction, Request, Response } from 'express';

import {
  CreateRequestSchema,
  createValidationError,
  type ApiResponse,
} from '@medgrid/shared';

import { createRequest } from './request.service';

export const createRequestController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = CreateRequestSchema.safeParse(req.body);

    if (!result.success) {
      console.log(result.error.flatten());

      return next(createValidationError());
    }

    const request = await createRequest();

    const response: ApiResponse<typeof request> = {
      success: true,
      message: 'Request created successfully',
      data: request,
      timestamp: new Date().toISOString(),
    };

    return res.status(201).json(response);
  } catch (error) {
    return next(error);
  }
};
