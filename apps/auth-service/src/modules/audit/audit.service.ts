import type { AuditLogQuery, PaginatedResponse, AuditLogDTO } from '@medgrid/shared';
import { listAuditLogs } from './audit.repository';

export const getAuditLogs = async (
  query: AuditLogQuery
): Promise<PaginatedResponse<AuditLogDTO>> => {
  const { logs, total } = await listAuditLogs(query);

  const items: AuditLogDTO[] = logs.map((log) => ({
    id: log.id,
    actorId: log.actorId,
    actorRole: log.actorRole,
    action: log.action as unknown as AuditLogDTO['action'],
    entityType: log.entityType,
    entityId: log.entityId,
    facilityId: log.facilityId,
    previousValue: log.previousValue,
    newValue: log.newValue,
    ipAddress: log.ipAddress,
    userAgent: log.userAgent,
    createdAt: log.createdAt.toISOString(),
  }));

  const page = query.page ?? 1;
  const pageSize = query.limit ?? 50;

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
};
