import type { NextFunction, Request, Response } from 'express';

import {
  InviteUserSchema,
  CompleteInvitationSchema,
  UpdateUserStatusSchema,
  ElevateSchema,
  createValidationError,
  type ApiResponse,
  type UserDTO,
  type InviteResponseDTO,
  type ElevateResponseDTO,
} from '@medgrid/shared';

import {
  inviteUser,
  completeInvitation,
  listUsers,
  getUserById,
  setUserStatus,
  elevate,
} from './users.service';

// ===========================================================================
// Header helpers
// ===========================================================================

const getFacilityId = (req: Request): string =>
  req.headers['x-facility-id'] as string;

const getFacilityIdOrNull = (req: Request): string | null => {
  const val = req.headers['x-facility-id'] as string | undefined;
  return val && val !== 'null' ? val : null;
};

const getUserId = (req: Request): string => req.headers['x-user-id'] as string;

const getUserRole = (req: Request): string =>
  req.headers['x-user-role'] as string;

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

    const response = await inviteUser(
      result.data,
      getFacilityId(req),
      getUserId(req),
      getUserRole(req)
    );

    const apiResponse: ApiResponse<InviteResponseDTO> = {
      success: true,
      message: 'User invited successfully',
      data: response,
      timestamp: new Date().toISOString(),
    };

    return res.status(201).json(apiResponse);
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

    const invitationToken = req.headers['x-invitation-token'] as string;

    const user = await completeInvitation({
      invitationToken,
      ...result.data,
    });

    const apiResponse: ApiResponse<UserDTO> = {
      success: true,
      message: 'Registration completed successfully. You can now log in.',
      data: user,
      timestamp: new Date().toISOString(),
    };

    return res.status(200).json(apiResponse);
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
    const users = await listUsers(getFacilityIdOrNull(req));

    const apiResponse: ApiResponse<UserDTO[]> = {
      success: true,
      message: 'Users retrieved successfully',
      data: users,
      timestamp: new Date().toISOString(),
    };

    return res.status(200).json(apiResponse);
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

    const user = await getUserById(id, getFacilityIdOrNull(req));

    const apiResponse: ApiResponse<UserDTO> = {
      success: true,
      message: 'User retrieved successfully',
      data: user,
      timestamp: new Date().toISOString(),
    };

    return res.status(200).json(apiResponse);
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

    const user = await setUserStatus(
      id,
      result.data,
      getUserId(req),
      getFacilityIdOrNull(req),
      getUserRole(req)
    );

    const apiResponse: ApiResponse<UserDTO> = {
      success: true,
      message: 'User status updated successfully',
      data: user,
      timestamp: new Date().toISOString(),
    };

    return res.status(200).json(apiResponse);
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

    const response = await elevate(result.data, getUserId(req));

    const apiResponse: ApiResponse<ElevateResponseDTO> = {
      success: true,
      message: 'Elevation granted',
      data: response,
      timestamp: new Date().toISOString(),
    };

    return res.status(200).json(apiResponse);
  } catch (error) {
    return next(error);
  }
};
