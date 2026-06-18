import type { NextFunction, Request, Response } from 'express';

import {
  CreateInventoryBatchSchema,
  type ApiResponse,
  createValidationError,
} from '@medgrid/shared';

import { createInventoryBatch } from './inventory.service';

export const createInventoryBatchController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = CreateInventoryBatchSchema.safeParse(req.body);

    if (!result.success) {
      console.log(result.error.flatten());

      return next(createValidationError());
    }

    const inventory = await createInventoryBatch(result.data);

    const response: ApiResponse<typeof inventory> = {
      success: true,
      message: 'Inventory batch created successfully',
      data: inventory,
      timestamp: new Date().toISOString(),
    };

    return res.status(201).json(response);
  } catch (error) {
    return next(error);
  }
};
