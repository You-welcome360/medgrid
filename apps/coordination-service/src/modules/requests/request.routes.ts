import { Router } from 'express';

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

requestRouter.post('/', createRequestController);
requestRouter.get('/', getRequestsController);
requestRouter.get('/broadcasts', getBroadcastsController);
requestRouter.get('/:id', getRequestByIdController);

requestRouter.post('/:id/accept', acceptRequestController);
requestRouter.post('/:id/reject', rejectRequestController);
requestRouter.post('/:id/dispatch', dispatchRequestController);
requestRouter.post('/:id/confirm', confirmReceiptController);
requestRouter.post('/:id/cancel', cancelRequestController);
requestRouter.post('/:id/fail', markFailedController);
requestRouter.post('/:id/accept-broadcast', claimBroadcastController);
requestRouter.post('/:id/decline-broadcast', declineBroadcastController);
