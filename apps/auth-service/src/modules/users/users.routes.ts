import { Router } from 'express';

import {
  inviteUserController,
  completeInvitationController,
  listUsersController,
  getUserByIdController,
  updateUserStatusController,
  elevateController,
} from './users.controller';

export const usersRouter = Router();

// Invitation flow — public (token carries auth)
usersRouter.post('/invite/complete', completeInvitationController);

// Protected — gateway enforces roles and forwards headers
usersRouter.post('/invite', inviteUserController);
usersRouter.get('/', listUsersController);
usersRouter.get('/:id', getUserByIdController);
usersRouter.patch('/:id/status', updateUserStatusController);

// Step-up auth for SUPER_ADMIN
usersRouter.post('/elevate', elevateController);
