import { api } from './client';
import type { AuditLogQuery, AuditLog, PaginatedResponse } from '@/types';

export const auditApi = {
  list: (query: AuditLogQuery) => {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });
    const queryString = params.toString();
    const url = `/audit-logs${queryString ? `?${queryString}` : ''}`;
    return api.get<PaginatedResponse<AuditLog>>(url);
  },
};

