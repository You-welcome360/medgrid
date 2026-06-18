import { Router } from 'express';

import {
  submitOnboardingRequestController,
  getOnboardingRequestsController,
  getOnboardingRequestByIdController,
  rejectOnboardingRequestController,
  approveOnboardingRequestController,
} from './onboarding.controller';

export const onboardingRouter = Router();

// Public — anyone can submit a request
onboardingRouter.post('/', submitOnboardingRequestController);

// Protected — gateway enforces SUPER_ADMIN before forwarding
onboardingRouter.get('/', getOnboardingRequestsController);

onboardingRouter.get('/:id', getOnboardingRequestByIdController);

onboardingRouter.post('/:id/reject', rejectOnboardingRequestController);

onboardingRouter.post('/:id/approve', approveOnboardingRequestController);
