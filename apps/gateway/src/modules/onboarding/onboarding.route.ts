import { Router } from 'express';

import { UserRole } from '@medgrid/shared';

import { requireRole } from '../../middlewares/require-role.middleware';

import {
  submitOnboardingRequestController,
  getOnboardingRequestsController,
  getOnboardingRequestByIdController,
  rejectOnboardingRequestController,
  approveOnboardingRequestController,
} from './onboarding.controller';

export const onboardingRouter = Router();

// Public — no auth required
onboardingRouter.post('/', submitOnboardingRequestController);

// Protected — SUPER_ADMIN only
onboardingRouter.get(
  '/',
  requireRole(UserRole.SUPER_ADMIN),
  getOnboardingRequestsController
);

onboardingRouter.get(
  '/:id',
  requireRole(UserRole.SUPER_ADMIN),
  getOnboardingRequestByIdController
);

onboardingRouter.post(
  '/:id/reject',
  requireRole(UserRole.SUPER_ADMIN),
  rejectOnboardingRequestController
);

onboardingRouter.post(
  '/:id/approve',
  requireRole(UserRole.SUPER_ADMIN),
  approveOnboardingRequestController
);
