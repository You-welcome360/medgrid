import { AuditAction } from '../../enums/AuditAction';

export interface AuditLogDTO {
  id: string;
  actorId: string | null;
  actorRole: string | null;
  action: AuditAction;
  entityType: string;
  entityId: string;
  facilityId: string | null;
  previousValue: any | null;
  newValue: any | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}
