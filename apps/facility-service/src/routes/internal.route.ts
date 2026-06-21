import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';

import {
  ResourceType,
  createNotFoundError,
  type ApiResponse,
  StockMovementType,
} from '@medgrid/shared';

import {
  findInventoryByName,
  createStockMovement,
  deriveCurrentQuantity,
  createInventoryItem,
} from '../modules/inventory/inventory.repository';

export const internalRouter = Router();

/**
 * GET /internal/inventory/lookup
 * Returns the inventory item with current stock, reserved threshold, and metadata.
 */
internalRouter.get(
  '/inventory/lookup',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { facilityId, itemName, resourceType } = req.query as {
        facilityId: string;
        itemName: string;
        resourceType: string;
      };

      const item = await findInventoryByName(
        facilityId,
        resourceType as ResourceType,
        itemName
      );

      if (!item) {
        return next(
          createNotFoundError(
            `No inventory item "${itemName}" found for facility ${facilityId}`
          )
        );
      }

      const currentStock = await deriveCurrentQuantity(item.id);

      const response: ApiResponse<{
        inventoryId: string;
        facilityId: string;
        itemName: string;
        resourceType: string;
        unit: string;
        metadata: unknown;
        currentStock: number;
        reservedThreshold: number | null;
      }> = {
        success: true,
        message: 'Inventory item found',
        data: {
          inventoryId: item.id,
          facilityId: item.facilityId,
          itemName: item.itemName,
          resourceType: item.resourceType,
          unit: item.unit,
          metadata: item.metadata,
          currentStock,
          reservedThreshold: item.reservedThreshold,
        },
        timestamp: new Date().toISOString(),
      };

      return res.status(200).json(response);
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * POST /internal/inventory/create-for-transfer
 * Creates a new inventory item in the requester's facility using supplier metadata.
 * Called when the requester doesn't have the item yet on CONFIRM_RECEIPT.
 */
internalRouter.post(
  '/inventory/create-for-transfer',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        facilityId,
        itemName,
        resourceType,
        unit,
        metadata,
        createdById,
      } = req.body as {
        facilityId: string;
        itemName: string;
        resourceType: string;
        unit: string;
        metadata: Record<string, unknown>;
        createdById: string;
      };

      const item = await createInventoryItem(
        {
          resourceType: resourceType as ResourceType,
          itemName,
          unit: unit as Parameters<typeof createInventoryItem>[0]['unit'],
          metadata,
        },
        facilityId,
        createdById
      );

      const response: ApiResponse<{ inventoryId: string }> = {
        success: true,
        message: 'Inventory item created for transfer',
        data: { inventoryId: item.id },
        timestamp: new Date().toISOString(),
      };

      return res.status(201).json(response);
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * POST /internal/inventory/:id/movements
 * Records a TRANSFER_OUT / TRANSFER_IN movement.
 */
internalRouter.post(
  '/inventory/:id/movements',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params['id'] as string;
      const {
        quantity,
        movementType,
        reason,
        performedById,
        referenceId,
        facilityId,
      } = req.body as {
        quantity: number;
        movementType: string;
        reason: string;
        performedById: string;
        referenceId: string;
        facilityId: string;
      };

      const movement = await createStockMovement(
        {
          quantity,
          movementType: movementType as StockMovementType,
          reason,
          referenceId,
        },
        id,
        facilityId,
        performedById
      );

      const response: ApiResponse<{ movementId: string }> = {
        success: true,
        message: 'Stock movement recorded',
        data: { movementId: movement.id },
        timestamp: new Date().toISOString(),
      };

      return res.status(201).json(response);
    } catch (error) {
      return next(error);
    }
  }
);
