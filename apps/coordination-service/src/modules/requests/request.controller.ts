import type { NextFunction, Request, Response } from 'express';

import {
  CreateRequestSchema,
  RejectRequestSchema,
  CancelRequestSchema,
  createValidationError,
  RequestStatus,
  type ApiResponse,
  type ResourceRequestDTO,
} from '@medgrid/shared';

import {
  createRequest,
  getRequests,
  getRequestById,
  accept,
  reject,
  dispatch,
  confirmReceipt,
  cancel,
  markFailed,
} from './request.service';

// ===========================================================================
// Header helpers
// ===========================================================================

const getFacilityId = (req: Request): string =>
  req.headers['x-facility-id'] as string;

const getUserId = (req: Request): string => req.headers['x-user-id'] as string;

// SUPER_ADMIN passes 'null' string — convert to actual null
const getFacilityIdOrNull = (req: Request): string | null => {
  const val = req.headers['x-facility-id'] as string | undefined;
  return val && val !== 'null' ? val : null;
};

// ===========================================================================
// Controllers
// ===========================================================================

export const createRequestController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = CreateRequestSchema.safeParse(req.body);

    if (!result.success) {
      return next(createValidationError());
    }

    const request = await createRequest(
      result.data,
      getFacilityId(req),
      getUserId(req)
    );

    const response: ApiResponse<ResourceRequestDTO> = {
      success: true,
      message: 'Resource request created successfully',
      data: request,
      timestamp: new Date().toISOString(),
    };

    return res.status(201).json(response);
  } catch (error) {
    return next(error);
  }
};

export const getRequestsController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { status } = req.query;

    const validStatus =
      status && Object.values(RequestStatus).includes(status as RequestStatus)
        ? (status as RequestStatus)
        : undefined;

    const requests = await getRequests(getFacilityIdOrNull(req), validStatus);

    const response: ApiResponse<ResourceRequestDTO[]> = {
      success: true,
      message: 'Resource requests retrieved successfully',
      data: requests,
      timestamp: new Date().toISOString(),
    };

    return res.status(200).json(response);
  } catch (error) {
    return next(error);
  }
};

export const getRequestByIdController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params['id'] as string;

    const request = await getRequestById(id, getFacilityIdOrNull(req));

    const response: ApiResponse<ResourceRequestDTO> = {
      success: true,
      message: 'Resource request retrieved successfully',
      data: request,
      timestamp: new Date().toISOString(),
    };

    return res.status(200).json(response);
  } catch (error) {
    return next(error);
  }
};

export const acceptRequestController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params['id'] as string;

    const result = await accept(id, getFacilityId(req), getUserId(req));

    const response: ApiResponse<ResourceRequestDTO> = {
      success: true,
      message: result.reservedThresholdWarning
        ? `Request accepted. ⚠️ ${result.reservedThresholdWarning}`
        : 'Request accepted',
      data: result,
      timestamp: new Date().toISOString(),
    };

    return res.status(200).json(response);
  } catch (error) {
    return next(error);
  }
};

export const rejectRequestController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params['id'] as string;

    const result = RejectRequestSchema.safeParse(req.body);

    if (!result.success) {
      return next(createValidationError());
    }

    const request = await reject(
      id,
      getFacilityId(req),
      getUserId(req),
      result.data
    );

    const response: ApiResponse<ResourceRequestDTO> = {
      success: true,
      message: 'Request rejected',
      data: request,
      timestamp: new Date().toISOString(),
    };

    return res.status(200).json(response);
  } catch (error) {
    return next(error);
  }
};

export const dispatchRequestController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params['id'] as string;

    const request = await dispatch(id, getFacilityId(req), getUserId(req));

    const response: ApiResponse<ResourceRequestDTO> = {
      success: true,
      message: 'Request dispatched — in transit',
      data: request,
      timestamp: new Date().toISOString(),
    };

    return res.status(200).json(response);
  } catch (error) {
    return next(error);
  }
};

export const confirmReceiptController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params['id'] as string;

    const request = await confirmReceipt(
      id,
      getFacilityId(req),
      getUserId(req)
    );

    const response: ApiResponse<ResourceRequestDTO> = {
      success: true,
      message: 'Receipt confirmed — request completed',
      data: request,
      timestamp: new Date().toISOString(),
    };

    return res.status(200).json(response);
  } catch (error) {
    return next(error);
  }
};

export const cancelRequestController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params['id'] as string;

    const result = CancelRequestSchema.safeParse(req.body);

    if (!result.success) {
      return next(createValidationError());
    }

    const request = await cancel(
      id,
      getFacilityId(req),
      getUserId(req),
      result.data
    );

    const response: ApiResponse<ResourceRequestDTO> = {
      success: true,
      message: 'Request cancelled',
      data: request,
      timestamp: new Date().toISOString(),
    };

    return res.status(200).json(response);
  } catch (error) {
    return next(error);
  }
};

export const markFailedController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params['id'] as string;

    const request = await markFailed(id, getFacilityId(req), getUserId(req));

    const response: ApiResponse<ResourceRequestDTO> = {
      success: true,
      message: 'Request marked as failed',
      data: request,
      timestamp: new Date().toISOString(),
    };

    return res.status(200).json(response);
  } catch (error) {
    return next(error);
  }
};
