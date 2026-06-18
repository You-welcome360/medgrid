import type { NextFunction, Request, Response } from 'express';

import {
  CreateFacilitySchema,
  createValidationError,
  type ApiResponse,
} from '@medgrid/shared';

import { createFacility } from './facility.service';

export const createFacilityController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = CreateFacilitySchema.safeParse(req.body);

    if (!result.success) {
      console.log(result.error.flatten());

      return next(createValidationError());
    }

    const facility = await createFacility();

    const response: ApiResponse<typeof facility> = {
      success: true,
      message: 'Facility created successfully',
      data: facility,
      timestamp: new Date().toISOString(),
    };

    return res.status(201).json(response);
  } catch (error) {
    return next(error);
  }
};
