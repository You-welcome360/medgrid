import type { NextFunction, Request, Response } from 'express';

import {
  CreateFacilitySchema,
  UpdateFacilitySchema,
  createValidationError,
} from '@medgrid/shared';

import {
  createFacilityInFacilityService,
  getAllFacilitiesFromFacilityService,
  getFacilityByIdFromFacilityService,
  updateFacilityInFacilityService,
  getFacilityBalanceFromFacilityService,
  initializeFacilityTopUpInFacilityService,
  getFacilityBalanceHistoryFromFacilityService,
  relayPaystackWebhookToFacilityService,
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

    return res.status(response.statusCode).json(response.body);
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
    return res.status(response.statusCode).json(response.body);
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
    return res.status(response.statusCode).json(response.body);
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
    const result = UpdateFacilitySchema.safeParse(req.body);

    if (!result.success) {
      return next(createValidationError());
    }

    const response = await updateFacilityInFacilityService(id, result.data);
    return res.status(response.statusCode).json(response.body);
  } catch (error) {
    return next(error);
  }
};

export const getFacilityBalanceController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = res.locals.user;
    const facilityId = user?.facilityId;
    if (!facilityId) {
      return res
        .status(400)
        .json({ success: false, message: 'Facility ID is required' });
    }
    const response = await getFacilityBalanceFromFacilityService(facilityId);
    return res.status(200).json(response);
  } catch (error) {
    return next(error);
  }
};

export const initializeFacilityTopUpController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = res.locals.user;
    const facilityId = user?.facilityId;
    if (!facilityId) {
      return res
        .status(400)
        .json({ success: false, message: 'Facility ID is required' });
    }
    const response = await initializeFacilityTopUpInFacilityService(
      facilityId,
      req.body
    );
    return res.status(200).json(response);
  } catch (error) {
    return next(error);
  }
};

export const getFacilityBalanceHistoryController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = res.locals.user;
    const facilityId = user?.facilityId;
    if (!facilityId) {
      return res
        .status(400)
        .json({ success: false, message: 'Facility ID is required' });
    }
    const response = await getFacilityBalanceHistoryFromFacilityService(
      facilityId,
      req.query
    );
    return res.status(200).json(response);
  } catch (error) {
    return next(error);
  }
};

export const paystackWebhookController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const signature = req.headers['x-paystack-signature'] as string | undefined;
    const rawBody = (req as Request & { rawBody?: Buffer }).rawBody
      ? (req as Request & { rawBody?: Buffer }).rawBody!.toString('utf8')
      : JSON.stringify(req.body);

    const response = await relayPaystackWebhookToFacilityService(
      rawBody,
      signature,
      req.body
    );
    return res.status(200).json(response);
  } catch (error) {
    return next(error);
  }
};
