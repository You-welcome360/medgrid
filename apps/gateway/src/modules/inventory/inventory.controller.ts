import type { NextFunction, Request, Response } from 'express';

import {
  CreateInventoryBatchSchema,
  createValidationError,
} from '@medgrid/shared';

import { createInventoryBatch } from '../../clients/facility';

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

    const batch = await createInventoryBatch(result.data);

    // const response: ApiResponse<
    //   typeof batch
    // > = {
    //   success: true,
    //   message:
    //     'Inventory batch created successfully',
    //   data: batch,
    //   timestamp:
    //     new Date().toISOString(),
    // };

    return res.status(201).json(batch);
  } catch (error) {
    return next(error);
  }
};
