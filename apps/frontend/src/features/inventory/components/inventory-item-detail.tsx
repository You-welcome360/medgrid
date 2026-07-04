import { useState } from 'react';
import { format } from 'date-fns';
import { Plus, Trash2, AlertTriangle } from 'lucide-react';

import {
  useInventoryItem,
  useStockMovements,
  useUpdateInventoryStatus,
  useSetThreshold,
  useSetReservedThreshold,
  useUpdatePrice,
  useDeleteInventoryItem,
} from '@/features/inventory/hooks/use-inventory';
import { RecordMovementDialog } from './record-movement-dialog';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { InventoryStatusBadge } from '@/components/shared/status-badge';
import { EmptyState } from '@/components/shared/empty-state';
import type { InventoryStatus, StockMovementType } from '@/types';

const MOVEMENT_COLORS: Record<string, string> = {
  RESTOCK: 'text-green-600',
  TRANSFER_IN: 'text-green-600',
  CONSUMPTION: 'text-red-600',
  TRANSFER_OUT: 'text-red-600',
  EXPIRED_REMOVAL: 'text-orange-600',
  DAMAGE: 'text-orange-600',
  ADJUSTMENT: 'text-blue-600',
};

interface InventoryItemDetailProps {
  id: string;
}

export function InventoryItemDetail({ id }: InventoryItemDetailProps) {
  const [movementOpen, setMovementOpen] = useState(false);
  const { data: item, isLoading } = useInventoryItem(id);
  const { data: movements = [], isLoading: movementsLoading } =
    useStockMovements(id);
  const updateStatus = useUpdateInventoryStatus();
  const setThreshold = useSetThreshold();
  const setReservedThreshold = useSetReservedThreshold();
  const updatePrice = useUpdatePrice();
  const deleteItem = useDeleteInventoryItem();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!item) return null;

  const thresholdPct =
    item.lowStockThreshold && item.quantity > 0
      ? Math.min((item.quantity / (item.lowStockThreshold * 2)) * 100, 100)
      : 100;

  const isLow =
    item.lowStockThreshold !== null && item.quantity <= item.lowStockThreshold;

  return (
    <div className="space-y-6">
      {/* Overview card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                {item.resourceType.replace('_', ' ')}
              </p>
              <h2 className="mt-1 text-2xl font-semibold">{item.itemName}</h2>
              <div className="mt-2 flex items-center gap-2">
                <InventoryStatusBadge status={item.status} />
                {isLow && (
                  <span className="flex items-center gap-1 text-xs text-orange-600">
                    <AlertTriangle className="h-3 w-3" />
                    Low stock
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => setMovementOpen(true)}>
                <Plus className="mr-1.5 h-4 w-4" />
                Record Movement
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => deleteItem.mutate(id)}
                disabled={deleteItem.isPending}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="grid gap-6 sm:grid-cols-3">
            {/* Quantity */}
            <div>
              <p className="text-sm text-muted-foreground">Current Stock</p>
              <p className="mt-1 text-3xl font-bold">
                {item.quantity.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">
                {item.unit.toLowerCase()}
              </p>
              {item.lowStockThreshold !== null && (
                <div className="mt-3">
                  <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                    <span>Stock level</span>
                    <span>Threshold: {item.lowStockThreshold}</span>
                  </div>
                  <Progress
                    value={thresholdPct}
                    className={`h-2 ${isLow ? '[&>div]:bg-orange-500' : ''}`}
                  />
                </div>
              )}
            </div>

            {/* Status control */}
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <div className="mt-2">
                <Select
                  value={item.status}
                  onValueChange={(val) =>
                    updateStatus.mutate({ id, status: val as InventoryStatus })
                  }
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      'AVAILABLE',
                      'RESERVED',
                      'UNAVAILABLE',
                      'MAINTENANCE',
                      'EXPIRED',
                      'DEPLETED',
                    ].map((s) => (
                      <SelectItem key={s} value={s}>
                        {s.charAt(0) + s.slice(1).toLowerCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Purchase & Shareability */}
            <div>
              <p className="text-sm text-muted-foreground">Properties</p>
              <div className="mt-2 space-y-2 text-sm">
                <div className="flex justify-between border-b pb-1">
                  <span className="text-muted-foreground">Unit Price</span>
                  <span className="font-medium">
                    {item.price !== undefined && item.price !== null ? `GH₵${item.price.toFixed(2)}` : '—'}
                  </span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span className="text-muted-foreground">Shareability</span>
                  <span className="font-medium text-xs">
                    {item.isMovable ? (
                      <span className="text-emerald-600">Movable</span>
                    ) : (
                      <span className="text-slate-500">Stationary</span>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Threshold controls — 3 columns */}
            <div className="sm:col-span-3 grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">
                  Low Stock Threshold
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Alert fires when stock drops below this
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    defaultValue={item.lowStockThreshold ?? ''}
                    className="flex h-9 w-24 rounded-md border border-input bg-background px-3 py-1 text-sm"
                    onBlur={(e) => {
                      const val = parseInt(e.target.value);
                      if (!isNaN(val) && val >= 0) {
                        setThreshold.mutate({ id, threshold: val });
                      }
                    }}
                    placeholder="None"
                  />
                  <span className="text-xs text-muted-foreground">units</span>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">
                  Reserved Threshold
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Warning fires when a request would drop below this
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    defaultValue={item.reservedThreshold ?? ''}
                    className="flex h-9 w-24 rounded-md border border-input bg-background px-3 py-1 text-sm"
                    onBlur={(e) => {
                      const val = parseInt(e.target.value);
                      if (!isNaN(val) && val >= 0) {
                        setReservedThreshold.mutate({ id, threshold: val });
                      }
                    }}
                    placeholder="None"
                  />
                  <span className="text-xs text-muted-foreground">units</span>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">
                  Unit Price (GHS)
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Cost per unit charged to other facilities
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    defaultValue={item.price ?? ''}
                    className="flex h-9 w-24 rounded-md border border-input bg-background px-3 py-1 text-sm"
                    onBlur={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!isNaN(val) && val >= 0) {
                        updatePrice.mutate({ id, price: val });
                      }
                    }}
                    placeholder="None"
                  />
                  <span className="text-xs text-muted-foreground">GH₵</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Movement history */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Movement History</CardTitle>
        </CardHeader>
        <CardContent>
          {movementsLoading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : movements.length === 0 ? (
            <EmptyState
              title="No movements recorded"
              description="Stock movements will appear here"
            />
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>
                        <span
                          className={`text-sm font-medium ${MOVEMENT_COLORS[m.movementType] ?? ''}`}
                        >
                          {(m.movementType as StockMovementType).replace(
                            '_',
                            ' '
                          )}
                        </span>
                      </TableCell>
                      <TableCell
                        className={`font-mono font-medium ${m.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}
                      >
                        {m.quantity > 0 ? '+' : ''}
                        {m.quantity}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {m.reason ?? '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(m.createdAt), 'MMM d, HH:mm')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <RecordMovementDialog
        inventoryId={id}
        open={movementOpen}
        onOpenChange={setMovementOpen}
      />
    </div>
  );
}
