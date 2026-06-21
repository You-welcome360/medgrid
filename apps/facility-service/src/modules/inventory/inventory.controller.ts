import type { NextFunction, Request, Response } from 'express';

import {
  CreateInventoryBatchSchema,
  UpdateInventoryStatusSchema,
  CreateStockMovementSchema,
  SetThresholdSchema,
  createValidationError,
  InventoryStatus,
  ResourceType,
  type ApiResponse,
  type InventoryItemDTO,
  type LowStockAlertDTO,
  type StockMovementDTO,
} from '@medgrid/shared';

import {
  createInventory,
  getInventoryByFacility,
  getInventoryItemById,
  setInventoryStatus,
  deleteInventory,
  updateThreshold,
  updateReservedThreshold,
  recordStockMovement,
  getStockMovements,
  getActiveAlerts,
  getAlertsByInventoryItem,
  getAvailableInventoryForFacility,
} from './inventory.service';

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

    const facilityId = req.headers['x-facility-id'] as string;
    const performedById = req.headers['x-user-id'] as string;

    const item = await createInventory(result.data, facilityId, performedById);

    const response: ApiResponse<InventoryItemDTO> = {
      success: true,
      message: 'Inventory item created successfully',
      data: item,
      timestamp: new Date().toISOString(),
    };

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
    const facilityId = req.headers['x-facility-id'] as string;
    const { resourceType, status } = req.query;

    const validResourceType =
      resourceType &&
      Object.values(ResourceType).includes(resourceType as ResourceType)
        ? (resourceType as ResourceType)
        : undefined;

    const validStatus =
      status &&
      Object.values(InventoryStatus).includes(status as InventoryStatus)
        ? (status as InventoryStatus)
        : undefined;

    const items = await getInventoryByFacility(
      facilityId,
      validResourceType,
      validStatus
    );

    const response: ApiResponse<InventoryItemDTO[]> = {
      success: true,
      message: 'Inventory retrieved successfully',
      data: items,
      timestamp: new Date().toISOString(),
    };

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
    const facilityId = req.headers['x-facility-id'] as string;

    const item = await getInventoryItemById(id, facilityId);

    const response: ApiResponse<InventoryItemDTO> = {
      success: true,
      message: 'Inventory item retrieved successfully',
      data: item,
      timestamp: new Date().toISOString(),
    };

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
    const facilityId = req.headers['x-facility-id'] as string;
    const performedById = req.headers['x-user-id'] as string;

    const result = UpdateInventoryStatusSchema.safeParse(req.body);

    if (!result.success) {
      return next(createValidationError());
    }

    const item = await setInventoryStatus(
      id,
      facilityId,
      result.data,
      performedById
    );

    const response: ApiResponse<InventoryItemDTO> = {
      success: true,
      message: 'Inventory status updated successfully',
      data: item,
      timestamp: new Date().toISOString(),
    };

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
    const facilityId = req.headers['x-facility-id'] as string;
    const performedById = req.headers['x-user-id'] as string;

    await deleteInventory(id, facilityId, performedById);

    const response: ApiResponse<null> = {
      success: true,
      message: 'Inventory item deleted successfully',
      timestamp: new Date().toISOString(),
    };

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
    const facilityId = req.headers['x-facility-id'] as string;
    const performedById = req.headers['x-user-id'] as string;

    const result = CreateStockMovementSchema.safeParse(req.body);

    if (!result.success) {
      return next(createValidationError());
    }

    const movement = await recordStockMovement(
      id,
      facilityId,
      result.data,
      performedById
    );

    const response: ApiResponse<StockMovementDTO> = {
      success: true,
      message: 'Stock movement recorded successfully',
      data: movement,
      timestamp: new Date().toISOString(),
    };

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
    const facilityId = req.headers['x-facility-id'] as string;

    const movements = await getStockMovements(id, facilityId);

    const response: ApiResponse<StockMovementDTO[]> = {
      success: true,
      message: 'Stock movements retrieved successfully',
      data: movements,
      timestamp: new Date().toISOString(),
    };

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
    const facilityId = req.headers['x-facility-id'] as string;
    const performedById = req.headers['x-user-id'] as string;

    const result = SetThresholdSchema.safeParse(req.body);

    if (!result.success) {
      return next(createValidationError());
    }

    const item = await updateThreshold(
      id,
      facilityId,
      result.data,
      performedById
    );

    const response: ApiResponse<InventoryItemDTO> = {
      success: true,
      message: 'Low stock threshold updated successfully',
      data: item,
      timestamp: new Date().toISOString(),
    };

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
    const facilityId = req.headers['x-facility-id'] as string;

    const alerts = await getActiveAlerts(facilityId);

    const response: ApiResponse<LowStockAlertDTO[]> = {
      success: true,
      message: 'Active low stock alerts retrieved successfully',
      data: alerts,
      timestamp: new Date().toISOString(),
    };

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
    const facilityId = req.headers['x-facility-id'] as string;

    const alerts = await getAlertsByInventoryItem(id, facilityId);

    const response: ApiResponse<LowStockAlertDTO[]> = {
      success: true,
      message: 'Alert history retrieved successfully',
      data: alerts,
      timestamp: new Date().toISOString(),
    };

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
    const facilityId = req.headers['x-facility-id'] as string;
    const performedById = req.headers['x-user-id'] as string;

    const result = SetThresholdSchema.safeParse(req.body);

    if (!result.success) {
      return next(createValidationError());
    }

    const item = await updateReservedThreshold(
      id,
      facilityId,
      result.data.threshold,
      performedById
    );

    const response: ApiResponse<InventoryItemDTO> = {
      success: true,
      message: 'Reserved threshold updated successfully',
      data: item,
      timestamp: new Date().toISOString(),
    };

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

    if (!facilityId) {
      return next(createValidationError());
    }

    const validResourceType =
      resourceType &&
      Object.values(ResourceType).includes(resourceType as ResourceType)
        ? (resourceType as ResourceType)
        : undefined;

    const items = await getAvailableInventoryForFacility(
      facilityId,
      validResourceType
    );

    const response: ApiResponse<InventoryItemDTO[]> = {
      success: true,
      message: 'Available inventory retrieved successfully',
      data: items,
      timestamp: new Date().toISOString(),
    };

    return res.status(200).json(response);
  } catch (error) {
    return next(error);
  }
};
