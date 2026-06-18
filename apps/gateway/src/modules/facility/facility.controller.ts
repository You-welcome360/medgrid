import type { NextFunction, Request, Response } from 'express';

import { CreateFacilitySchema, createValidationError } from '@medgrid/shared';

import { createFacilityInFacilityService } from '../../clients/facility/facility';

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

    const response = await createFacilityInFacilityService(result.data);

    return res.status(201).json(response);
  } catch (error) {
    return next(error);
  }
};
