import type { CookieOptions, NextFunction, Request, Response } from 'express';

import {
  LoginSchema,
  ChangePasswordSchema,
  createValidationError,
  type AuthenticatedUserDTO,
  type ApiResponse,
  type LoginResponseDTO,
} from '@medgrid/shared';
import { writeAuditLog, AuditAction } from '@medgrid/database';

import { env } from '../../config/env';
import {
  getCurrentUser,
  login,
  refreshSession,
  changePassword,
} from './auth.service';

const REFRESH_TOKEN_COOKIE = 'medgrid_refresh_token';

const refreshCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

export const loginController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = LoginSchema.safeParse(req.body);

    if (!result.success) {
      return next(createValidationError());
    }

    const resultData = await login(result.data);

    res.cookie(
      REFRESH_TOKEN_COOKIE,
      resultData.refreshToken,
      refreshCookieOptions
    );

    const response: ApiResponse<LoginResponseDTO> = {
      success: true,
      message: 'Login successful',
      data: resultData.response,
      timestamp: new Date().toISOString(),
    };

    return res.status(200).json(response);
  } catch (error) {
    return next(error);
  }
};

export const refreshController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const resultData = await refreshSession(
      req.cookies?.[REFRESH_TOKEN_COOKIE]
    );

    const response: ApiResponse<LoginResponseDTO> = {
      success: true,
      message: 'Session refreshed successfully',
      data: resultData.response,
      timestamp: new Date().toISOString(),
    };

    return res.status(200).json(response);
  } catch (error) {
    return next(error);
  }
};

export const logoutController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Best-effort: get the user from the refresh token to record who logged out.
    // If the token is already invalid we still clear the cookie and succeed.
    try {
      const user = await getCurrentUser(
        req.headers.authorization,
        req.cookies?.[REFRESH_TOKEN_COOKIE]
      );

      await writeAuditLog({
        actorId: user.id,
        actorRole: user.role,
        action: AuditAction.LOGOUT,
        entityType: 'User',
        entityId: user.id,
        facilityId: user.facilityId ?? undefined,
      });
    } catch {
      // Swallow — token may be expired, logout should still succeed
    }

    res.clearCookie(REFRESH_TOKEN_COOKIE, refreshCookieOptions);

    const response: ApiResponse<null> = {
      success: true,
      message: 'Logout successful',
      timestamp: new Date().toISOString(),
    };

    return res.status(200).json(response);
  } catch (error) {
    return next(error);
  }
};

export const meController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = await getCurrentUser(
      req.headers.authorization,
      req.cookies?.[REFRESH_TOKEN_COOKIE]
    );

    const response: ApiResponse<AuthenticatedUserDTO> = {
      success: true,
      message: 'Authenticated user retrieved successfully',
      data: user,
      timestamp: new Date().toISOString(),
    };

    return res.status(200).json(response);
  } catch (error) {
    return next(error);
  }
};

export const changePasswordController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = ChangePasswordSchema.safeParse(req.body);

    if (!result.success) {
      return next(createValidationError());
    }

    await changePassword(req.headers.authorization, result.data);

    const response: ApiResponse<null> = {
      success: true,
      message: 'Password changed successfully',
      timestamp: new Date().toISOString(),
    };

    return res.status(200).json(response);
  } catch (error) {
    return next(error);
  }
};
