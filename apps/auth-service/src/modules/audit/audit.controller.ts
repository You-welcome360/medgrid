import type { NextFunction, Request, Response } from 'express';
import {
  AuditLogQuerySchema,
  createValidationError,
  type ApiResponse,
  type PaginatedResponse,
  type AuditLogDTO,
} from '@medgrid/shared';
import { getAuditLogs } from './audit.service';

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

    const responseData = await getAuditLogs(result.data);

    const apiResponse: ApiResponse<PaginatedResponse<AuditLogDTO>> = {
      success: true,
      message: 'Audit logs retrieved successfully',
      data: responseData,
      timestamp: new Date().toISOString(),
    };

    return res.status(200).json(apiResponse);
  } catch (error) {
    return next(error);
  }
};
