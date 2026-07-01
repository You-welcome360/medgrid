import type { NextFunction, Request, Response } from 'express';
import {
  AuditLogQuerySchema,
  createValidationError,
  type AuthenticatedUserDTO,
} from '@medgrid/shared';
import { listAuditLogsFromAuthService } from '../../clients/auth';

const getUserHeaders = (req: Request, res: Response) => {
  const user = res.locals.user as AuthenticatedUserDTO;

  return {
    authorizationHeader: req.headers.authorization,
    facilityId: user.facilityId ?? null,
    userId: user.id,
    userRole: user.role,
  };
};

export const listAuditLogsController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = AuditLogQuerySchema.safeParse(req.query);

    if (!result.success) {
      return next(createValidationError('Invalid query parameters'));
    }

    const response = await listAuditLogsFromAuthService(
      result.data,
      getUserHeaders(req, res)
    );

    return res.status(200).json(response);
  } catch (error) {
    return next(error);
  }
};
