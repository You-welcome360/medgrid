import { useAuthStore } from '@/stores/auth.store';
import type { UserRole } from '@/types';

export function useRole() {
  const user = useAuthStore((s) => s.user);

  const role = user?.role ?? null;

  return {
    role,
    isSuperAdmin: role === 'SUPER_ADMIN',
    isFacilityAdmin: role === 'FACILITY_ADMIN',
    isCoordinationManager: role === 'COORDINATION_MANAGER',
    isInventoryManager: role === 'INVENTORY_MANAGER',
    hasRole: (...roles: UserRole[]) => !!role && roles.includes(role),
  };
}
