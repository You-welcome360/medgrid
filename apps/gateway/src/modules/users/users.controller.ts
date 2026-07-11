import type { NextFunction, Request, Response } from 'express';

import {
  InviteUserSchema,
  CompleteInvitationSchema,
  UpdateUserStatusSchema,
  ElevateSchema,
  createValidationError,
  type AuthenticatedUserDTO,
} from '@medgrid/shared';

import {
  inviteUserInAuthService,
  completeInvitationInAuthService,
  listUsersFromAuthService,
  getUserByIdFromAuthService,
  updateUserStatusInAuthService,
  elevateInAuthService,
} from '../../clients/auth';

// ===========================================================================
// Header helper
// ===========================================================================

const getUserHeaders = (req: Request, res: Response) => {
  const user = res.locals.user as AuthenticatedUserDTO;

  return {
    authorizationHeader: req.headers.authorization,
    facilityId:
      (req.headers['x-facility-id'] as string) ||
      res.locals.targetFacilityId ||
      user.facilityId ||
      null,
    userId: user.id,
    userRole: user.role,
  };
};

// ===========================================================================
// Controllers
// ===========================================================================

export const inviteUserController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = InviteUserSchema.safeParse(req.body);

    if (!result.success) {
      return next(createValidationError());
    }

    const response = await inviteUserInAuthService(
      result.data,
      getUserHeaders(req, res)
    );

    return res.status(response.statusCode).json(response.body);
  } catch (error) {
    return next(error);
  }
};

export const completeInvitationController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = CompleteInvitationSchema.safeParse(req.body);

    if (!result.success) {
      return next(createValidationError());
    }

    // Invitation token comes from query param — easy for the invitee to use
    const invitationToken = req.query['token'] as string;

    if (!invitationToken) {
      return next(createValidationError());
    }

    const response = await completeInvitationInAuthService(
      result.data,
      invitationToken
    );

    return res.status(response.statusCode).json(response.body);
  } catch (error) {
    return next(error);
  }
};

export const listUsersController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const response = await listUsersFromAuthService(getUserHeaders(req, res));

    return res.status(response.statusCode).json(response.body);
  } catch (error) {
    return next(error);
  }
};

export const getUserByIdController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params['id'] as string;

    const response = await getUserByIdFromAuthService(
      id,
      getUserHeaders(req, res)
    );

    return res.status(response.statusCode).json(response.body);
  } catch (error) {
    return next(error);
  }
};

export const updateUserStatusController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params['id'] as string;

    const result = UpdateUserStatusSchema.safeParse(req.body);

    if (!result.success) {
      return next(createValidationError());
    }

    const response = await updateUserStatusInAuthService(
      id,
      result.data,
      getUserHeaders(req, res)
    );

    return res.status(response.statusCode).json(response.body);
  } catch (error) {
    return next(error);
  }
};

export const elevateController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = ElevateSchema.safeParse(req.body);

    if (!result.success) {
      return next(createValidationError());
    }

    const user = res.locals.user as AuthenticatedUserDTO;

    const response = await elevateInAuthService(
      result.data,
      req.headers.authorization,
      user.id
    );

    return res.status(response.statusCode).json(response.body);
  } catch (error) {
    return next(error);
  }
};
