import { Package, AlertTriangle } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { EmptyState } from '@/components/shared/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import type { InventoryItem, LowStockAlert } from '@/types';

interface InventoryHealthProps {
  inventory: InventoryItem[];
  alerts: LowStockAlert[];
  isLoading: boolean;
}

const RESOURCE_TYPE_LABELS: Record<string, string> = {
  BLOOD: 'Blood',
  PPE: 'PPE',
  MEDICATION: 'Medication',
  MEDICAL_EQUIPMENT: 'Equipment',
};

export function InventoryHealth({
  inventory,
  alerts,
  isLoading,
}: InventoryHealthProps) {
  // Group by resource type, compute totals
  const grouped = inventory.reduce<
    Record<string, { quantity: number; items: InventoryItem[] }>
  >((acc, item) => {
    if (!acc[item.resourceType]) {
      acc[item.resourceType] = { quantity: 0, items: [] };
    }
    acc[item.resourceType].quantity += item.quantity;
    acc[item.resourceType].items.push(item);
    return acc;
  }, {});

  const maxQuantity = Math.max(
    ...Object.values(grouped).map((g) => g.quantity),
    1
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Package className="h-4 w-4 text-blue-500" />
          Inventory Health
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-2 w-full" />
              </div>
            ))}
          </div>
        ) : Object.keys(grouped).length === 0 ? (
          <EmptyState icon={Package} title="No inventory data" />
        ) : (
          <div className="space-y-4">
            {Object.entries(grouped).map(([type, data]) => (
              <div key={type}>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {RESOURCE_TYPE_LABELS[type] ?? type}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {data.quantity.toLocaleString()} units
                  </span>
                </div>
                <Progress
                  value={(data.quantity / maxQuantity) * 100}
                  className="h-2"
                />
              </div>
            ))}

            {alerts.length > 0 && (
              <div className="mt-3 rounded-lg bg-orange-50 p-3 dark:bg-orange-950/20">
                <div className="flex items-center gap-2 text-sm font-medium text-orange-700 dark:text-orange-400">
                  <AlertTriangle className="h-4 w-4" />
                  {alerts.length} low stock{' '}
                  {alerts.length === 1 ? 'alert' : 'alerts'}
                </div>
                <ul className="mt-2 space-y-1">
                  {alerts.slice(0, 3).map((alert) => (
                    <li
                      key={alert.id}
                      className="text-xs text-muted-foreground"
                    >
                      {alert.itemName} — {alert.quantityAtTime} remaining (
                      threshold: {alert.thresholdAtTime})
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
