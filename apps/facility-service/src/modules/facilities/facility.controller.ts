import type { NextFunction, Request, Response } from 'express';

import {
  CreateFacilitySchema,
  createValidationError,
  type ApiResponse,
} from '@medgrid/shared';

import {
  createFacility,
  getAllFacilities,
  getFacilityById,
  updateFacility,
} from './facility.service';

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

export const getAllFacilitiesController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const facilities = await getAllFacilities();

    const response: ApiResponse<typeof facilities> = {
      success: true,
      message: 'Facilities retrieved successfully',
      data: facilities,
      timestamp: new Date().toISOString(),
    };

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

    const facility = await getFacilityById(id);

    const response: ApiResponse<typeof facility> = {
      success: true,
      message: 'Facility retrieved successfully',
      data: facility,
      timestamp: new Date().toISOString(),
    };

    return res.status(200).json(response);
  } catch (error) {
    return next(error);
  }
};

export const updateFacilityController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params['id'] as string;
    const facility = await updateFacility(id, req.body);

    const response: ApiResponse<typeof facility> = {
      success: true,
      message: 'Facility updated successfully',
      data: facility,
      timestamp: new Date().toISOString(),
    };

    return res.status(200).json(response);
  } catch (error) {
    return next(error);
  }
};

