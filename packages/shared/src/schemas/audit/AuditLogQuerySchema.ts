import { z } from 'zod';
import { AuditAction } from '../../enums/AuditAction';

export const AuditLogQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(50),
  action: z.nativeEnum(AuditAction).optional(),
  category: z.enum(['AUTH', 'ONBOARDING', 'FACILITY', 'USER', 'INVENTORY', 'REQUEST']).optional(),
  actorRole: z.string().optional(),
  facilityId: z.string().optional(),
  dateFrom: z.string().optional().or(z.literal('')),
  dateTo: z.string().optional().or(z.literal('')),
  search: z.string().optional(),
});

export type AuditLogQuery = z.infer<typeof AuditLogQuerySchema>;
