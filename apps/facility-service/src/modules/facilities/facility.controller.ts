import type { NextFunction, Request, Response } from 'express';

import {
  CreateFacilitySchema,
  InitializeTopUpSchema,
  createValidationError,
  type ApiResponse,
} from '@medgrid/shared';

import {
  createFacility,
  getAllFacilities,
  getFacilityById,
  updateFacility,
  getFacilityBalance,
  initializeTopUp,
  getBalanceHistory,
  processPaystackWebhook,
} from './facility.service';

import { PaystackService } from '../../utils/paystack';

export const createFacilityController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = CreateFacilitySchema.safeParse(req.body);

    if (!result.success) {
      return next(createValidationError());
    }

    const facility = await createFacility();

    const response: ApiResponse<typeof facility> = {
      success: true,
      message: 'Facility created successfully',
      data: facility,
      timestamp: new Date().toISOString(),
    };

    return res.status(201).json(response);
  } catch (error) {
    return next(error);
  }
};

export const getAllFacilitiesController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const facilities = await getAllFacilities();

    const response: ApiResponse<typeof facilities> = {
      success: true,
      message: 'Facilities retrieved successfully',
      data: facilities,
      timestamp: new Date().toISOString(),
    };

    return res.status(200).json(response);
  } catch (error) {
    return next(error);
  }
};

export const getFacilityByIdController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params['id'] as string;

    const facility = await getFacilityById(id);

    const response: ApiResponse<typeof facility> = {
      success: true,
      message: 'Facility retrieved successfully',
      data: facility,
      timestamp: new Date().toISOString(),
    };

    return res.status(200).json(response);
  } catch (error) {
    return next(error);
  }
};

export const updateFacilityController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params['id'] as string;
    const facility = await updateFacility(id, req.body);

    const response: ApiResponse<typeof facility> = {
      success: true,
      message: 'Facility updated successfully',
      data: facility,
      timestamp: new Date().toISOString(),
    };

    return res.status(200).json(response);
  } catch (error) {
    return next(error);
  }
};

export const getFacilityBalanceController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const facilityId = req.headers['x-facility-id'] as string;
    const balance = await getFacilityBalance(facilityId);

    const response: ApiResponse<typeof balance> = {
      success: true,
      message: 'Facility balance retrieved successfully',
      data: balance,
      timestamp: new Date().toISOString(),
    };

    return res.status(200).json(response);
  } catch (error) {
    return next(error);
  }
};

export const initializeFacilityTopUpController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const facilityId = req.headers['x-facility-id'] as string;
    const email = req.body.email || 'admin@medgrid.com';

    const result = InitializeTopUpSchema.safeParse({ ...req.body, facilityId });
    if (!result.success) {
      return next(createValidationError());
    }

    const data = await initializeTopUp(
      result.data.facilityId || facilityId,
      email,
      result.data.amount,
      result.data.callbackUrl
    );

    const response: ApiResponse<typeof data> = {
      success: true,
      message: 'Balance top-up initialized',
      data,
      timestamp: new Date().toISOString(),
    };

    return res.status(200).json(response);
  } catch (error) {
    return next(error);
  }
};

export const getFacilityBalanceHistoryController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const facilityId = req.headers['x-facility-id'] as string;
    const page = parseInt(req.query['page'] as string || '1', 10);
    const limit = parseInt(req.query['limit'] as string || '20', 10);
    const type = req.query['type'] as string;

    const data = await getBalanceHistory(facilityId, { page, limit, type });

    const response: ApiResponse<typeof data> = {
      success: true,
      message: 'Transaction history retrieved successfully',
      data,
      timestamp: new Date().toISOString(),
    };

    return res.status(200).json(response);
  } catch (error) {
    return next(error);
  }
};

export const paystackWebhookController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const signature = req.headers['x-paystack-signature'] as string | undefined;
    const rawBody = (req as any).rawBody 
      ? (req as any).rawBody.toString('utf8') 
      : JSON.stringify(req.body);

    if (!PaystackService.verifySignature(rawBody, signature)) {
      return res.status(401).json({ success: false, message: 'Invalid signature' });
    }

    const { event, data } = req.body;
    if (!event || !data || !data.reference) {
      return res.status(400).json({ success: false, message: 'Invalid webhook payload' });
    }

    let result;
    if (event === 'charge.success') {
      result = await processPaystackWebhook(data.reference, 'success');
    } else if (event === 'charge.failed') {
      result = await processPaystackWebhook(data.reference, 'failed');
    } else {
      return res.status(200).json({ success: true, status: 'ignored' });
    }

    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return next(error);
  }
};


