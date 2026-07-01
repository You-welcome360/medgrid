import { prisma, Prisma } from '@medgrid/database';
import { AuditAction, type AuditLogQuery } from '@medgrid/shared';

const getActionsByCategory = (category: string): AuditAction[] => {
  switch (category) {
    case 'AUTH':
      return [
        AuditAction.LOGIN,
        AuditAction.LOGOUT,
        AuditAction.LOGIN_FAILED,
        AuditAction.PASSWORD_CHANGED,
        AuditAction.ACCOUNT_LOCKED,
      ];
    case 'ONBOARDING':
      return [
        AuditAction.ONBOARDING_REQUEST_SUBMITTED,
        AuditAction.ONBOARDING_REQUEST_APPROVED,
        AuditAction.ONBOARDING_REQUEST_REJECTED,
      ];
    case 'FACILITY':
      return [
        AuditAction.FACILITY_CREATED,
        AuditAction.FACILITY_UPDATED,
        AuditAction.FACILITY_SUSPENDED,
      ];
    case 'USER':
      return [
        AuditAction.USER_CREATED,
        AuditAction.USER_SUSPENDED,
        AuditAction.USER_DEACTIVATED,
        AuditAction.USER_ROLE_CHANGED,
      ];
    case 'INVENTORY':
      return [
        AuditAction.INVENTORY_CREATED,
        AuditAction.INVENTORY_UPDATED,
        AuditAction.INVENTORY_ADJUSTED,
        AuditAction.INVENTORY_DELETED,
      ];
    case 'REQUEST':
      return [
        AuditAction.REQUEST_CREATED,
        AuditAction.REQUEST_ACCEPTED,
        AuditAction.REQUEST_REJECTED,
        AuditAction.REQUEST_COMPLETED,
        AuditAction.REQUEST_CANCELLED,
        AuditAction.REQUEST_DISPATCHED,
        AuditAction.REQUEST_FAILED,
      ];
    default:
      return [];
  }
};

export const listAuditLogs = async (query: AuditLogQuery) => {
  const {
    page = 1,
    limit = 50,
    action,
    category,
    actorRole,
    facilityId,
    dateFrom,
    dateTo,
    search,
  } = query;

  const where: Prisma.AuditLogWhereInput = {};

  if (action) {
    where.action = action as any;
  } else if (category) {
    const actions = getActionsByCategory(category);
    where.action = { in: actions as any[] };
  }

  if (actorRole) {
    where.actorRole = actorRole;
  }

  if (facilityId) {
    where.facilityId = facilityId;
  }

  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) {
      where.createdAt.gte = new Date(dateFrom);
    }
    if (dateTo) {
      where.createdAt.lte = new Date(dateTo);
    }
  }

  if (search) {
    const searchTrimmed = search.trim();
    if (searchTrimmed) {
      where.OR = [
        { actorId: { contains: searchTrimmed, mode: 'insensitive' } },
        { entityId: { contains: searchTrimmed, mode: 'insensitive' } },
        { entityType: { contains: searchTrimmed, mode: 'insensitive' } },
        { ipAddress: { contains: searchTrimmed, mode: 'insensitive' } },
        { userAgent: { contains: searchTrimmed, mode: 'insensitive' } },
      ];
    }
  }

  const total = await prisma.auditLog.count({ where });
  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * limit,
    take: limit,
  });

  return {
    logs,
    total,
  };
};
