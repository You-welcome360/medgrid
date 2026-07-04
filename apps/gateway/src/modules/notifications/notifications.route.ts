import { Router } from 'express';
import { requireRole } from '../../middlewares/require-role.middleware';
import { UserRole } from '@medgrid/shared';
import {
  listNotificationsController,
  markReadController,
  markAllReadController,
  getPreferencesController,
  updatePreferencesController,
} from './notifications.controller';

export const notificationsRouter = Router();

const canRead = requireRole(
  UserRole.SUPER_ADMIN,
  UserRole.FACILITY_ADMIN,
  UserRole.COORDINATION_MANAGER,
  UserRole.INVENTORY_MANAGER
);

notificationsRouter.get('/', canRead, listNotificationsController);
notificationsRouter.put('/mark-all-read', canRead, markAllReadController);
notificationsRouter.put('/:id/read', canRead, markReadController);

notificationsRouter.get('/preferences', canRead, getPreferencesController);
notificationsRouter.put('/preferences', canRead, updatePreferencesController);
