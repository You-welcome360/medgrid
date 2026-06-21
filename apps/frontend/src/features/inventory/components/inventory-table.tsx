import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Eye } from 'lucide-react';

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
import { InventoryStatusBadge } from '@/components/shared/status-badge';
import { EmptyState } from '@/components/shared/empty-state';
import { Package } from 'lucide-react';
import type { InventoryItem } from '@/types';

const TYPE_LABELS: Record<string, string> = {
  BLOOD: 'Blood',
  PPE: 'PPE',
  MEDICATION: 'Medication',
  MEDICAL_EQUIPMENT: 'Equipment',
};

interface InventoryTableProps {
  items: InventoryItem[];
  isLoading: boolean;
}

export function InventoryTable({ items, isLoading }: InventoryTableProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={Package}
        title="No inventory items"
        description="Add items to track your facility's resources"
      />
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Quantity</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Threshold</TableHead>
            <TableHead className="w-16" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const isLow =
              item.lowStockThreshold !== null &&
              item.quantity <= item.lowStockThreshold;

            return (
              <TableRow
                key={item.id}
                className="cursor-pointer"
                onClick={() => navigate(`/inventory/${item.id}`)}
              >
                <TableCell>
                  <div className="flex items-center gap-2">
                    {isLow && (
                      <AlertTriangle className="h-4 w-4 shrink-0 text-orange-500" />
                    )}
                    <span className="font-medium">{item.itemName}</span>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {TYPE_LABELS[item.resourceType] ?? item.resourceType}
                </TableCell>
                <TableCell>
                  {item.quantity.toLocaleString()}{' '}
                  <span className="text-xs text-muted-foreground">
                    {item.unit.toLowerCase()}
                  </span>
                </TableCell>
                <TableCell>
                  <InventoryStatusBadge status={item.status} />
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {item.lowStockThreshold ?? '—'}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/inventory/${item.id}`);
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
