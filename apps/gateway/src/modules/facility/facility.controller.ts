import type { NextFunction, Request, Response } from 'express';

import { CreateFacilitySchema, createValidationError } from '@medgrid/shared';

import {
  createFacilityInFacilityService,
  getAllFacilitiesFromFacilityService,
  getFacilityByIdFromFacilityService,
} from '../../clients/facility';

export const createFacilityController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = CreateFacilitySchema.safeParse(req.body);

    if (!result.success) {
      return next(createValidationError());
    }

    const response = await createFacilityInFacilityService(result.data);

    return res.status(201).json(response);
  } catch (error) {
    return next(error);
  }
};

export const getAllFacilitiesController = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const response = await getAllFacilitiesFromFacilityService();
    return res.status(200).json(response);
  } catch (error) {
    return next(error);
  }
};

export const getFacilityByIdController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params['id'] as string;
    const response = await getFacilityByIdFromFacilityService(id);
    return res.status(200).json(response);
  } catch (error) {
    return next(error);
  }
};
