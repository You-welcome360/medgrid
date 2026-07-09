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

const forwardSetCookie = (req: Request, res: Response, setCookie: string | null) => {
  if (setCookie) {
    const origin = req.headers.origin || '';
    const host = req.headers.host || '';
    const isNgrokOrHttps =
      origin.startsWith('https://') ||
      origin.includes('ngrok-free') ||
      host.includes('ngrok-free') ||
      req.secure;

    if (isNgrokOrHttps) {
      let modified = setCookie.replace(/SameSite=[a-zA-Z]+/i, 'SameSite=None');
      if (!modified.includes('SameSite=')) {
        modified += '; SameSite=None';
      }
      if (!/Secure/i.test(modified)) {
        modified += '; Secure';
      }
      res.setHeader('Set-Cookie', modified);
    } else {
      res.setHeader('Set-Cookie', setCookie);
    }
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

    forwardSetCookie(req, res, response.setCookie);

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

    forwardSetCookie(req, res, response.setCookie);

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

    forwardSetCookie(req, res, response.setCookie);

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

    forwardSetCookie(req, res, response.setCookie);

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
