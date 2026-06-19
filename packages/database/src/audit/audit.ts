import { Prisma } from '../generated/prisma/client';
import { AuditAction as PrismaAuditAction } from '../generated/prisma/enums';
import prisma from '../client/client';

// Re-export so services can import AuditAction from @medgrid/database
// without needing to know about the generated path
export { AuditAction as PrismaAuditAction } from '../generated/prisma/enums';

export interface WriteAuditLogParams {
  actorId?: string;
  actorRole?: string;
  action: PrismaAuditAction;
  entityType: string;
  entityId: string;
  facilityId?: string;
  previousValue?: Prisma.InputJsonValue;
  newValue?: Prisma.InputJsonValue;
  ipAddress?: string;
  userAgent?: string;
}

export const writeAuditLog = async (
  params: WriteAuditLogParams
): Promise<void> => {
  await prisma.auditLog.create({
    data: {
      actorId: params.actorId,
      actorRole: params.actorRole,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      facilityId: params.facilityId,
      previousValue: params.previousValue,
      newValue: params.newValue,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    },
  });
};
