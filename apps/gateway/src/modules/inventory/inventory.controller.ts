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
  getAvailableInventoryFromFacilityService,
  getInventoryItemFromFacilityService,
  updateInventoryStatusInFacilityService,
  deleteInventoryInFacilityService,
  setThresholdInFacilityService,
  setReservedThresholdInFacilityService,
  createStockMovementInFacilityService,
  getStockMovementsFromFacilityService,
  getActiveAlertsFromFacilityService,
  getAlertsByInventoryFromFacilityService,
  getNetworkResourcesFromFacilityService,
  getNetworkFacilitiesFromFacilityService,
  updateInventoryPriceInFacilityService,
  triggerExpiryCheckInFacilityService,
  getExpiryAlertsFromFacilityService,
  getRedistributionOffersFromFacilityService,
  createRedistributionOfferInFacilityService,
  claimRedistributionOfferInFacilityService,
} from '../../clients/facility';

// ===========================================================================
// Helpers
// ===========================================================================

const getInventoryHeaders = (req: Request, res: Response) => {
  const user = res.locals.user as AuthenticatedUserDTO;

  return {
    authorizationHeader: req.headers.authorization,
    facilityId:
      (req.headers['x-facility-id'] as string) ||
      res.locals.targetFacilityId ||
      user.facilityId ||
      '',
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

export const setReservedThresholdController = async (
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

    const response = await setReservedThresholdInFacilityService(
      id,
      result.data,
      getInventoryHeaders(req, res)
    );

    return res.status(200).json(response);
  } catch (error) {
    return next(error);
  }
};

export const getAvailableInventoryController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { facilityId, resourceType } = req.query as {
      facilityId: string;
      resourceType?: string;
    };

    const response = await getAvailableInventoryFromFacilityService(
      facilityId,
      resourceType,
      getInventoryHeaders(req, res)
    );

    return res.status(200).json(response);
  } catch (error) {
    return next(error);
  }
};

export const getNetworkResourcesController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const response = await getNetworkResourcesFromFacilityService(
      getInventoryHeaders(req, res)
    );

    return res.status(200).json(response);
  } catch (error) {
    return next(error);
  }
};

export const getNetworkFacilitiesController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { resourceType, itemName } = req.query as {
      resourceType: string;
      itemName?: string;
    };

    if (!resourceType) {
      return next(createValidationError('resourceType is required'));
    }

    const response = await getNetworkFacilitiesFromFacilityService(
      resourceType,
      itemName,
      getInventoryHeaders(req, res)
    );

    return res.status(200).json(response);
  } catch (error) {
    return next(error);
  }
};

export const setPriceController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params['id'] as string;
    const { price } = req.body;

    if (
      price === undefined ||
      price === null ||
      isNaN(Number(price)) ||
      Number(price) < 0
    ) {
      return next(createValidationError('Price must be a non-negative number'));
    }

    const response = await updateInventoryPriceInFacilityService(
      id,
      Number(price),
      getInventoryHeaders(req, res)
    );

    return res.status(200).json(response);
  } catch (error) {
    return next(error);
  }
};

export const manualExpiryCheckController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const response = await triggerExpiryCheckInFacilityService(
      getInventoryHeaders(req, res)
    );
    return res.status(200).json(response);
  } catch (error) {
    return next(error);
  }
};

export const getExpiryAlertsController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const response = await getExpiryAlertsFromFacilityService(
      getInventoryHeaders(req, res)
    );
    return res.status(200).json(response);
  } catch (error) {
    return next(error);
  }
};

export const getRedistributionOffersController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const response = await getRedistributionOffersFromFacilityService(
      getInventoryHeaders(req, res)
    );
    return res.status(200).json(response);
  } catch (error) {
    return next(error);
  }
};

export const createRedistributionOfferController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params['id'] as string;
    const { quantity, price } = req.body;

    const response = await createRedistributionOfferInFacilityService(
      id,
      { quantity: Number(quantity), price: Number(price) },
      getInventoryHeaders(req, res)
    );
    return res.status(201).json(response);
  } catch (error) {
    return next(error);
  }
};

export const claimRedistributionOfferController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const offerId = req.params['offerId'] as string;
    const headers = getInventoryHeaders(req, res);

    const claimRes = await claimRedistributionOfferInFacilityService(
      offerId,
      headers
    );

    return res.status(200).json(claimRes);
  } catch (error) {
    return next(error);
  }
};
