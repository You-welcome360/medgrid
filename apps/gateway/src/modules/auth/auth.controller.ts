import type { NextFunction, Request, Response } from 'express';

import {
  LoginSchema,
  ChangePasswordSchema,
  createValidationError,
} from '@medgrid/shared';

import {
  getMeFromAuthService,
  loginWithAuthService,
  logoutWithAuthService,
  refreshWithAuthService,
  changePasswordWithAuthService,
} from '../../clients/auth';

const forwardSetCookie = (res: Response, setCookie: string | null) => {
  if (setCookie) {
    res.setHeader('Set-Cookie', setCookie);
  }
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

    const response = await loginWithAuthService(result.data);

    forwardSetCookie(res, response.setCookie);

    return res.status(response.statusCode).json(response.body);
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
    const response = await refreshWithAuthService(req.headers.cookie);

    forwardSetCookie(res, response.setCookie);

    return res.status(response.statusCode).json(response.body);
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
    const response = await logoutWithAuthService(req.headers.cookie);

    forwardSetCookie(res, response.setCookie);

    return res.status(response.statusCode).json(response.body);
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
    const response = await getMeFromAuthService(
      req.headers.authorization,
      req.headers.cookie
    );

    forwardSetCookie(res, response.setCookie);

    return res.status(response.statusCode).json(response.body);
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

    const response = await changePasswordWithAuthService(
      req.headers.authorization,
      result.data
    );

    return res.status(response.statusCode).json(response.body);
  } catch (error) {
    return next(error);
  }
};
