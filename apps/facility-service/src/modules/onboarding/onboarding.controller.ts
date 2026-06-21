import type { NextFunction, Request, Response } from 'express';

import {
  SubmitOnboardingRequestSchema,
  RejectOnboardingRequestSchema,
  OnboardingRequestStatus,
  createValidationError,
  type ApiResponse,
  type OnboardingRequestDTO,
  type ApproveOnboardingResponseDTO,
} from '@medgrid/shared';

import {
  submitOnboardingRequest,
  getOnboardingRequests,
  getOnboardingRequestById,
  rejectRequest,
  approveRequest,
} from './onboarding.service';

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

    const request = await submitOnboardingRequest(result.data);

    const response: ApiResponse<OnboardingRequestDTO> = {
      success: true,
      message: 'Onboarding request submitted successfully',
      data: request,
      timestamp: new Date().toISOString(),
    };

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
    const { status } = req.query;

    const validStatus =
      status &&
      Object.values(OnboardingRequestStatus).includes(
        status as OnboardingRequestStatus
      )
        ? (status as OnboardingRequestStatus)
        : undefined;

    const requests = await getOnboardingRequests(validStatus);

    const response: ApiResponse<OnboardingRequestDTO[]> = {
      success: true,
      message: 'Onboarding requests retrieved successfully',
      data: requests,
      timestamp: new Date().toISOString(),
    };

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
    const id = req.params['id'] as string;

    const request = await getOnboardingRequestById(id);

    const response: ApiResponse<OnboardingRequestDTO> = {
      success: true,
      message: 'Onboarding request retrieved successfully',
      data: request,
      timestamp: new Date().toISOString(),
    };

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
    const id = req.params['id'] as string;
    const adminId = req.headers['x-admin-id'] as string;

    const result = RejectOnboardingRequestSchema.safeParse(req.body);

    if (!result.success) {
      return next(createValidationError());
    }

    const request = await rejectRequest(id, adminId, result.data.reason);

    const response: ApiResponse<OnboardingRequestDTO> = {
      success: true,
      message: 'Onboarding request rejected',
      data: request,
      timestamp: new Date().toISOString(),
    };

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
    const id = req.params['id'] as string;
    const superAdminId = req.headers['x-admin-id'] as string;

    const result = await approveRequest(id, superAdminId);

    const response: ApiResponse<ApproveOnboardingResponseDTO> = {
      success: true,
      message:
        'Onboarding request approved. Facility and admin account created.',
      data: result,
      timestamp: new Date().toISOString(),
    };

    return res.status(201).json(response);
  } catch (error) {
    return next(error);
  }
};
