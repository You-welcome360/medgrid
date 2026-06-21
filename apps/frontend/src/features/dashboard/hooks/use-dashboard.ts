import { useQuery } from '@tanstack/react-query';

import { inventoryApi } from '@/api/inventory.api';
import { requestsApi } from '@/api/requests.api';

export function useDashboardData() {
  const requests = useQuery({
    queryKey: ['requests'],
    queryFn: () => requestsApi.list(),
  });

  const inventory = useQuery({
    queryKey: ['inventory'],
    queryFn: () => inventoryApi.list(),
  });

  const alerts = useQuery({
    queryKey: ['inventory', 'alerts'],
    queryFn: () => inventoryApi.getActiveAlerts(),
  });

  const allRequests = requests.data?.data ?? [];
  const allInventory = inventory.data?.data ?? [];
  const activeAlerts = alerts.data?.data ?? [];

  const activeRequests = allRequests.filter(
    (r) => !['COMPLETED', 'CANCELLED', 'REJECTED', 'FAILED'].includes(r.status)
  );

  const criticalRequests = activeRequests.filter(
    (r) => r.priority === 'CRITICAL' || r.priority === 'HIGH'
  );

  const pendingRequests = allRequests.filter((r) => r.status === 'PENDING');

  const totalResources = allInventory.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  const availableResources = allInventory
    .filter((i) => i.status === 'AVAILABLE')
    .reduce((sum, item) => sum + item.quantity, 0);

  return {
    isLoading: requests.isLoading || inventory.isLoading || alerts.isLoading,
    activeRequests,
    criticalRequests,
    pendingRequests,
    allRequests,
    allInventory,
    activeAlerts,
    totalResources,
    availableResources,
  };
}
