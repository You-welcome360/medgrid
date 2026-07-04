import { Router } from 'express';

import { UserRole } from '@medgrid/shared';

import { requireRole } from '../../middlewares/require-role.middleware';

import {
  createRequestController,
  getRequestsController,
  getRequestByIdController,
  acceptRequestController,
  rejectRequestController,
  dispatchRequestController,
  confirmReceiptController,
  cancelRequestController,
  markFailedController,
  getBroadcastsController,
  claimBroadcastController,
  declineBroadcastController,
} from './request.controller';

export const requestRouter = Router();

// COORDINATION_MANAGER creates requests
const canCreate = requireRole(UserRole.COORDINATION_MANAGER);

// Supplier-side: FACILITY_ADMIN or COORDINATION_MANAGER of the supplying facility
const supplierAction = requireRole(
  UserRole.FACILITY_ADMIN,
  UserRole.COORDINATION_MANAGER
);

// Dispatch + fail: INVENTORY_MANAGER or FACILITY_ADMIN of supplying facility
const dispatchAction = requireRole(
  UserRole.INVENTORY_MANAGER,
  UserRole.FACILITY_ADMIN
);

// Confirm receipt: INVENTORY_MANAGER or FACILITY_ADMIN of requesting facility
const confirmAction = requireRole(
  UserRole.INVENTORY_MANAGER,
  UserRole.FACILITY_ADMIN
);

// Read: all roles + SUPER_ADMIN
const canRead = requireRole(
  UserRole.SUPER_ADMIN,
  UserRole.FACILITY_ADMIN,
  UserRole.COORDINATION_MANAGER,
  UserRole.INVENTORY_MANAGER
);

// Claim/decline broadcasts: FACILITY_ADMIN, COORDINATION_MANAGER, or INVENTORY_MANAGER
const claimAction = requireRole(
  UserRole.FACILITY_ADMIN,
  UserRole.COORDINATION_MANAGER,
  UserRole.INVENTORY_MANAGER
);

requestRouter.post('/', canCreate, createRequestController);
requestRouter.get('/', canRead, getRequestsController);
requestRouter.get('/broadcasts', canRead, getBroadcastsController);
requestRouter.get('/:id', canRead, getRequestByIdController);

requestRouter.post('/:id/accept', supplierAction, acceptRequestController);
requestRouter.post('/:id/reject', supplierAction, rejectRequestController);
requestRouter.post('/:id/dispatch', dispatchAction, dispatchRequestController);
requestRouter.post('/:id/confirm', confirmAction, confirmReceiptController);
requestRouter.post('/:id/cancel', canCreate, cancelRequestController);
requestRouter.post('/:id/fail', dispatchAction, markFailedController);
requestRouter.post('/:id/accept-broadcast', claimAction, claimBroadcastController);
requestRouter.post('/:id/decline-broadcast', claimAction, declineBroadcastController);
