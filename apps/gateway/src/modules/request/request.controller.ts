import type { NextFunction, Request, Response } from 'express';

import {
  CreateRequestSchema,
  RejectRequestSchema,
  CancelRequestSchema,
  createValidationError,
  RequestStatus,
  type AuthenticatedUserDTO,
} from '@medgrid/shared';

import {
  createRequestInCoordinationService,
  getRequestsFromCoordinationService,
  getRequestByIdFromCoordinationService,
  acceptRequestInCoordinationService,
  rejectRequestInCoordinationService,
  dispatchRequestInCoordinationService,
  confirmReceiptInCoordinationService,
  cancelRequestInCoordinationService,
  markFailedInCoordinationService,
} from '../../clients/coordination';

// ===========================================================================
// Header helper
// ===========================================================================

const getRequestHeaders = (req: Request, res: Response) => {
  const user = res.locals.user as AuthenticatedUserDTO;

  return {
    authorizationHeader: req.headers.authorization,
    // SUPER_ADMIN has no facilityId — pass null so service does unrestricted query
    facilityId: user.facilityId ?? null,
    userId: user.id,
  };
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

    const response = await createRequestInCoordinationService(
      result.data,
      getRequestHeaders(req, res)
    );

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
        ? (status as string)
        : undefined;

    const response = await getRequestsFromCoordinationService(
      getRequestHeaders(req, res),
      validStatus
    );

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

    const response = await getRequestByIdFromCoordinationService(
      id,
      getRequestHeaders(req, res)
    );

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

    const response = await acceptRequestInCoordinationService(
      id,
      getRequestHeaders(req, res)
    );

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

    const response = await rejectRequestInCoordinationService(
      id,
      result.data,
      getRequestHeaders(req, res)
    );

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

    const response = await dispatchRequestInCoordinationService(
      id,
      getRequestHeaders(req, res)
    );

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

    const response = await confirmReceiptInCoordinationService(
      id,
      getRequestHeaders(req, res)
    );

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

    const response = await cancelRequestInCoordinationService(
      id,
      result.data,
      getRequestHeaders(req, res)
    );

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

    const response = await markFailedInCoordinationService(
      id,
      getRequestHeaders(req, res)
    );

    return res.status(200).json(response);
  } catch (error) {
    return next(error);
  }
};
