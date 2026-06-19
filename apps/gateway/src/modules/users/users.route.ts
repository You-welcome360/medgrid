import { Router } from 'express';

import { UserRole } from '@medgrid/shared';

import { requireRole } from '../../middlewares/require-role.middleware';

import {
  inviteUserController,
  completeInvitationController,
  listUsersController,
  getUserByIdController,
  updateUserStatusController,
  elevateController,
} from './users.controller';

export const usersRouter = Router();

// Public — invitation token is the auth mechanism
usersRouter.post('/invite/complete', completeInvitationController);

// Read — SUPER_ADMIN sees all, FACILITY_ADMIN/COORDINATION_MANAGER/INVENTORY_MANAGER see own facility
const canRead = requireRole(
  UserRole.SUPER_ADMIN,
  UserRole.FACILITY_ADMIN,
  UserRole.COORDINATION_MANAGER,
  UserRole.INVENTORY_MANAGER
);

usersRouter.get('/', canRead, listUsersController);
usersRouter.get('/:id', canRead, getUserByIdController);

// Invite — FACILITY_ADMIN (own facility) or SUPER_ADMIN (with elevated token, handled at mutation level)
const canInvite = requireRole(UserRole.FACILITY_ADMIN, UserRole.SUPER_ADMIN);

usersRouter.post('/invite', canInvite, inviteUserController);

// Status mutations — FACILITY_ADMIN (own facility) or SUPER_ADMIN elevated
const canMutate = requireRole(UserRole.FACILITY_ADMIN, UserRole.SUPER_ADMIN);

usersRouter.patch('/:id/status', canMutate, updateUserStatusController);

// Step-up auth — SUPER_ADMIN only
usersRouter.post(
  '/elevate',
  requireRole(UserRole.SUPER_ADMIN),
  elevateController
);
