import { Router } from 'express';
import { listAuditLogsController } from './audit.controller';

export const auditRouter = Router();

auditRouter.get('/', listAuditLogsController);
