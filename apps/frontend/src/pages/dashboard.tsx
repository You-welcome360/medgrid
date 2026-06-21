import {
  ArrowLeftRight,
  AlertTriangle,
  Building2,
  Package,
} from 'lucide-react';

import { useAuth } from '@/hooks/use-auth';
import { useDashboardData } from '@/features/dashboard/hooks/use-dashboard';
import { StatCard } from '@/features/dashboard/components/stat-card';
import { EmergencyFeed } from '@/features/dashboard/components/emergency-feed';
import { InventoryHealth } from '@/features/dashboard/components/inventory-health';
import { RecentActivity } from '@/features/dashboard/components/recent-activity';

export default function DashboardPage() {
  const { user } = useAuth();
  const {
    isLoading,
    activeRequests,
    criticalRequests,
    allRequests,
    allInventory,
    activeAlerts,
    availableResources,
  } = useDashboardData();

  const greeting = user ? `Welcome back, ${user.firstName}` : 'Welcome back';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{greeting}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Here's what's happening at your facility today.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Active Requests"
          value={activeRequests.length}
          subtitle="Currently in progress"
          icon={ArrowLeftRight}
          iconColor="text-blue-500"
          isLoading={isLoading}
        />
        <StatCard
          title="Critical Requests"
          value={criticalRequests.length}
          subtitle="High & critical priority"
          icon={AlertTriangle}
          iconColor="text-red-500"
          isLoading={isLoading}
        />
        <StatCard
          title="Inventory Items"
          value={allInventory.length}
          subtitle={`${activeAlerts.length} low stock alert${activeAlerts.length !== 1 ? 's' : ''}`}
          icon={Package}
          iconColor="text-green-500"
          isLoading={isLoading}
        />
        <StatCard
          title="Resources Available"
          value={availableResources.toLocaleString()}
          subtitle="Across all categories"
          icon={Building2}
          iconColor="text-purple-500"
          isLoading={isLoading}
        />
      </div>

      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Emergency feed — spans 1 col */}
        <EmergencyFeed requests={allRequests} isLoading={isLoading} />

        {/* Inventory health — spans 1 col */}
        <InventoryHealth
          inventory={allInventory}
          alerts={activeAlerts}
          isLoading={isLoading}
        />

        {/* Recent activity — spans 1 col */}
        <RecentActivity requests={allRequests} isLoading={isLoading} />
      </div>
    </div>
  );
}
