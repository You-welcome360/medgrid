import type { NextFunction, Request, Response } from 'express';

import {
  SubmitOnboardingRequestSchema,
  RejectOnboardingRequestSchema,
  createValidationError,
  type AuthenticatedUserDTO,
} from '@medgrid/shared';

import {
  submitOnboardingRequestToFacilityService,
  getOnboardingRequestsFromFacilityService,
  getOnboardingRequestByIdFromFacilityService,
  rejectOnboardingRequestInFacilityService,
  approveOnboardingRequestInFacilityService,
} from '../../clients/facility';

export const submitOnboardingRequestController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = SubmitOnboardingRequestSchema.safeParse(req.body);

    if (!result.success) {
      return next(createValidationError());
    }

    const response = await submitOnboardingRequestToFacilityService(
      result.data
    );

    return res.status(201).json(response);
  } catch (error) {
    return next(error);
  }
};

export const getOnboardingRequestsController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const admin = res.locals.user as AuthenticatedUserDTO;
    const { status } = req.query;

    const response = await getOnboardingRequestsFromFacilityService(
      status as string | undefined,
      req.headers.authorization,
      admin.id
    );

    return res.status(200).json(response);
  } catch (error) {
    return next(error);
  }
};

export const getOnboardingRequestByIdController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const admin = res.locals.user as AuthenticatedUserDTO;
    const id = req.params['id'] as string;

    const response = await getOnboardingRequestByIdFromFacilityService(
      id,
      req.headers.authorization,
      admin.id
    );

    return res.status(200).json(response);
  } catch (error) {
    return next(error);
  }
};

export const rejectOnboardingRequestController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const admin = res.locals.user as AuthenticatedUserDTO;
    const id = req.params['id'] as string;

    const result = RejectOnboardingRequestSchema.safeParse(req.body);

    if (!result.success) {
      return next(createValidationError());
    }

    const response = await rejectOnboardingRequestInFacilityService(
      id,
      result.data,
      req.headers.authorization,
      admin.id
    );

    return res.status(200).json(response);
  } catch (error) {
    return next(error);
  }
};

export const approveOnboardingRequestController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const admin = res.locals.user as AuthenticatedUserDTO;
    const id = req.params['id'] as string;

    const response = await approveOnboardingRequestInFacilityService(
      id,
      req.headers.authorization,
      admin.id
    );

    return res.status(201).json(response);
  } catch (error) {
    return next(error);
  }
};
