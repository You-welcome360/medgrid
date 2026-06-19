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
} from '../modules/inventory/inventory.repository';

export const internalRouter = Router();

/**
 * GET /internal/inventory/lookup
 * Service-to-service endpoint used by the coordination-service
 * to find an inventory item by facilityId + itemName + resourceType.
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

      const response: ApiResponse<{ inventoryId: string; facilityId: string }> =
        {
          success: true,
          message: 'Inventory item found',
          data: { inventoryId: item.id, facilityId: item.facilityId },
          timestamp: new Date().toISOString(),
        };

      return res.status(200).json(response);
    } catch (error) {
      return next(error);
    }
  }
);

/**
 * POST /internal/inventory/:id/movements
 * Service-to-service endpoint used by the coordination-service
 * to record TRANSFER_OUT / TRANSFER_IN movements on request completion.
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
