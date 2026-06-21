import { AlertTriangle, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  PriorityBadge,
  RequestStatusBadge,
} from '@/components/shared/status-badge';
import { EmptyState } from '@/components/shared/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import type { ResourceRequest } from '@/types';

interface EmergencyFeedProps {
  requests: ResourceRequest[];
  isLoading: boolean;
}

export function EmergencyFeed({ requests, isLoading }: EmergencyFeedProps) {
  const urgentRequests = requests
    .filter(
      (r) =>
        (r.priority === 'CRITICAL' || r.priority === 'HIGH') &&
        !['COMPLETED', 'CANCELLED', 'FAILED'].includes(r.status)
    )
    .slice(0, 5);

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          Emergency Feed
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : urgentRequests.length === 0 ? (
          <EmptyState
            icon={AlertTriangle}
            title="No urgent requests"
            description="All critical and high priority requests are resolved"
          />
        ) : (
          <div className="space-y-2">
            {urgentRequests.map((req) => (
              <div
                key={req.id}
                className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900/30 dark:bg-red-950/20"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {req.itemName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {req.quantity} {req.unit.toLowerCase()} needed
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <PriorityBadge priority={req.priority} />
                    <RequestStatusBadge status={req.status} />
                  </div>
                </div>
                <div className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(new Date(req.requestedAt), {
                    addSuffix: true,
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
