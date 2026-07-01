import { Router } from 'express';
import { UserRole } from '@medgrid/shared';
import { requireRole } from '../../middlewares/require-role.middleware';
import { listAuditLogsController } from './audit.controller';

export const auditRouter = Router();

auditRouter.get(
  '/',
  requireRole(UserRole.SUPER_ADMIN),
  listAuditLogsController
);
