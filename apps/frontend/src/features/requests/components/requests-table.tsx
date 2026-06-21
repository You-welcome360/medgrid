import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Eye, ArrowUpRight, ArrowDownLeft, ArrowLeftRight } from 'lucide-react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  RequestStatusBadge,
  PriorityBadge,
} from '@/components/shared/status-badge';
import { EmptyState } from '@/components/shared/empty-state';
import { useAuthStore } from '@/stores/auth.store';
import type { ResourceRequest } from '@/types';

interface RequestsTableProps {
  requests: ResourceRequest[];
  isLoading: boolean;
}

export function RequestsTable({ requests, isLoading }: RequestsTableProps) {
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.user);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <EmptyState
        icon={ArrowLeftRight}
        title="No requests found"
        description="Resource requests will appear here"
      />
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-24">ID</TableHead>
            <TableHead className="w-24">Direction</TableHead>
            <TableHead>Resource</TableHead>
            <TableHead>Quantity</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="w-16" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map((req) => {
            const isOutgoing =
              req.requestingFacilityId === currentUser?.facilityId;

            return (
              <TableRow
                key={req.id}
                className="cursor-pointer"
                onClick={() => navigate(`/requests/${req.id}`)}
              >
                <TableCell className="font-mono text-xs text-muted-foreground">
                  #{req.id.slice(0, 8)}
                </TableCell>
                <TableCell>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                      isOutgoing
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                    }`}
                  >
                    {isOutgoing ? (
                      <>
                        <ArrowUpRight className="h-3 w-3" />
                        Outgoing
                      </>
                    ) : (
                      <>
                        <ArrowDownLeft className="h-3 w-3" />
                        Incoming
                      </>
                    )}
                  </span>
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium">{req.itemName}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {req.resourceType.replace('_', ' ').toLowerCase()}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  {req.quantity} {req.unit.toLowerCase()}
                </TableCell>
                <TableCell>
                  <PriorityBadge priority={req.priority} />
                </TableCell>
                <TableCell>
                  <RequestStatusBadge status={req.status} />
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(req.requestedAt), {
                    addSuffix: true,
                  })}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/requests/${req.id}`);
                    }}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
