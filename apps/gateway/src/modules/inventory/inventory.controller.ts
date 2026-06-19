import type { NextFunction, Request, Response } from 'express';

import {
  CreateInventoryBatchSchema,
  UpdateInventoryStatusSchema,
  CreateStockMovementSchema,
  SetThresholdSchema,
  createValidationError,
  type AuthenticatedUserDTO,
} from '@medgrid/shared';

import {
  createInventoryInFacilityService,
  getInventoryFromFacilityService,
  getInventoryItemFromFacilityService,
  updateInventoryStatusInFacilityService,
  deleteInventoryInFacilityService,
  setThresholdInFacilityService,
  createStockMovementInFacilityService,
  getStockMovementsFromFacilityService,
  getActiveAlertsFromFacilityService,
  getAlertsByInventoryFromFacilityService,
} from '../../clients/facility';

// ===========================================================================
// Helpers
// ===========================================================================

const getInventoryHeaders = (req: Request, res: Response) => {
  const user = res.locals.user as AuthenticatedUserDTO;

  return {
    authorizationHeader: req.headers.authorization,
    facilityId: user.facilityId ?? '',
    userId: user.id,
  };
};

// ===========================================================================
// Inventory CRUD
// ===========================================================================

export const createInventoryController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = CreateInventoryBatchSchema.safeParse(req.body);

    if (!result.success) {
      return next(createValidationError());
    }

    const response = await createInventoryInFacilityService(
      result.data,
      getInventoryHeaders(req, res)
    );

    return res.status(201).json(response);
  } catch (error) {
    return next(error);
  }
};

export const getInventoryController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { resourceType, status } = req.query;

    const response = await getInventoryFromFacilityService(
      getInventoryHeaders(req, res),
      resourceType as string | undefined,
      status as string | undefined
    );

    return res.status(200).json(response);
  } catch (error) {
    return next(error);
  }
};

export const getInventoryItemController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params['id'] as string;

    const response = await getInventoryItemFromFacilityService(
      id,
      getInventoryHeaders(req, res)
    );

    return res.status(200).json(response);
  } catch (error) {
    return next(error);
  }
};

export const updateInventoryStatusController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params['id'] as string;

    const result = UpdateInventoryStatusSchema.safeParse(req.body);

    if (!result.success) {
      return next(createValidationError());
    }

    const response = await updateInventoryStatusInFacilityService(
      id,
      result.data,
      getInventoryHeaders(req, res)
    );

    return res.status(200).json(response);
  } catch (error) {
    return next(error);
  }
};

export const deleteInventoryController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params['id'] as string;

    const response = await deleteInventoryInFacilityService(
      id,
      getInventoryHeaders(req, res)
    );

    return res.status(200).json(response);
  } catch (error) {
    return next(error);
  }
};

// ===========================================================================
// Stock Movements
// ===========================================================================

export const createStockMovementController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params['id'] as string;

    const result = CreateStockMovementSchema.safeParse(req.body);

    if (!result.success) {
      return next(createValidationError());
    }

    const response = await createStockMovementInFacilityService(
      id,
      result.data,
      getInventoryHeaders(req, res)
    );

    return res.status(201).json(response);
  } catch (error) {
    return next(error);
  }
};

export const getStockMovementsController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params['id'] as string;

    const response = await getStockMovementsFromFacilityService(
      id,
      getInventoryHeaders(req, res)
    );

    return res.status(200).json(response);
  } catch (error) {
    return next(error);
  }
};

// ===========================================================================
// Threshold
// ===========================================================================

export const setThresholdController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params['id'] as string;

    const result = SetThresholdSchema.safeParse(req.body);

    if (!result.success) {
      return next(createValidationError());
    }

    const response = await setThresholdInFacilityService(
      id,
      result.data,
      getInventoryHeaders(req, res)
    );

    return res.status(200).json(response);
  } catch (error) {
    return next(error);
  }
};

// ===========================================================================
// Low Stock Alerts
// ===========================================================================

export const getActiveAlertsController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const response = await getActiveAlertsFromFacilityService(
      getInventoryHeaders(req, res)
    );

    return res.status(200).json(response);
  } catch (error) {
    return next(error);
  }
};

export const getAlertsByInventoryController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params['id'] as string;

    const response = await getAlertsByInventoryFromFacilityService(
      id,
      getInventoryHeaders(req, res)
    );

    return res.status(200).json(response);
  } catch (error) {
    return next(error);
  }
};
