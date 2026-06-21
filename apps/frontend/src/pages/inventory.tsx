import { Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { Plus, AlertTriangle } from 'lucide-react';
import { useState } from 'react';

import {
  useInventory,
  useActiveAlerts,
} from '@/features/inventory/hooks/use-inventory';
import { InventoryTable } from '@/features/inventory/components/inventory-table';
import { InventoryItemDetail } from '@/features/inventory/components/inventory-item-detail';
import { CreateInventoryForm } from '@/features/inventory/components/create-inventory-form';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRole } from '@/hooks/use-role';
import type { ResourceType } from '@/types';

// ============================================================
// List view
// ============================================================

function InventoryList() {
  const navigate = useNavigate();
  const { isInventoryManager, isFacilityAdmin } = useRole();
  const [activeType, setActiveType] = useState<ResourceType | 'ALL'>('ALL');

  const { data: items = [], isLoading } = useInventory(
    activeType === 'ALL' ? undefined : { resourceType: activeType }
  );

  const { data: alerts = [] } = useActiveAlerts();

  const canCreate = isInventoryManager || isFacilityAdmin;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory"
        description="Manage your facility's resources"
        action={
          canCreate ? (
            <Button onClick={() => navigate('/inventory/new')}>
              <Plus className="mr-2 h-4 w-4" />
              Add Item
            </Button>
          ) : undefined
        }
      />

      {/* Low stock alerts banner */}
      {alerts.length > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 dark:border-orange-900/30 dark:bg-orange-950/20">
          <AlertTriangle className="h-4 w-4 text-orange-500" />
          <span className="text-sm text-orange-700 dark:text-orange-400">
            {alerts.length} item{alerts.length > 1 ? 's are' : ' is'} below the
            low stock threshold
          </span>
        </div>
      )}

      <Tabs
        value={activeType}
        onValueChange={(v) => setActiveType(v as ResourceType | 'ALL')}
      >
        <TabsList>
          <TabsTrigger value="ALL">All</TabsTrigger>
          <TabsTrigger value="BLOOD">Blood</TabsTrigger>
          <TabsTrigger value="MEDICATION">Medication</TabsTrigger>
          <TabsTrigger value="PPE">PPE</TabsTrigger>
          <TabsTrigger value="MEDICAL_EQUIPMENT">Equipment</TabsTrigger>
        </TabsList>
      </Tabs>

      <InventoryTable items={items} isLoading={isLoading} />
    </div>
  );
}

// ============================================================
// Detail view
// ============================================================

function InventoryDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  if (!id) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory Item"
        action={
          <Button variant="outline" onClick={() => navigate('/inventory')}>
            ← Back to inventory
          </Button>
        }
      />
      <InventoryItemDetail id={id} />
    </div>
  );
}

// ============================================================
// Create view (stub — wired to full form later)
// ============================================================

function CreateInventoryPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Add Inventory Item"
        action={
          <Button variant="outline" onClick={() => navigate('/inventory')}>
            ← Back
          </Button>
        }
      />
      <div className="max-w-2xl">
        <CreateInventoryForm />
      </div>
    </div>
  );
}

// ============================================================
// Router
// ============================================================

export default function InventoryPage() {
  return (
    <Routes>
      <Route index element={<InventoryList />} />
      <Route path="new" element={<CreateInventoryPage />} />
      <Route path=":id" element={<InventoryDetailPage />} />
    </Routes>
  );
}
