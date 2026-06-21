import { ArrowLeftRight, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  RequestStatusBadge,
  PriorityBadge,
} from '@/components/shared/status-badge';
import { EmptyState } from '@/components/shared/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import type { ResourceRequest } from '@/types';

interface RecentActivityProps {
  requests: ResourceRequest[];
  isLoading: boolean;
}

export function RecentActivity({ requests, isLoading }: RecentActivityProps) {
  const recent = [...requests]
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
    .slice(0, 6);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ArrowLeftRight className="h-4 w-4 text-green-500" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : recent.length === 0 ? (
          <EmptyState
            icon={ArrowLeftRight}
            title="No recent activity"
            description="Request activity will appear here"
          />
        ) : (
          <div className="divide-y">
            {recent.map((req) => (
              <div key={req.id} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{req.itemName}</p>
                  <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(req.updatedAt), {
                      addSuffix: true,
                    })}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <RequestStatusBadge status={req.status} />
                  <PriorityBadge priority={req.priority} />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
