import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type {
  RequestStatus,
  RequestPriority,
  InventoryStatus,
  FacilityStatus,
  OnboardingRequestStatus,
  UserStatus,
} from '@/types';

// ============================================================
// Request Status
// ============================================================

const requestStatusMap: Record<
  RequestStatus,
  { label: string; className: string }
> = {
  PENDING: {
    label: 'Pending',
    className:
      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  },
  ACCEPTED: {
    label: 'Accepted',
    className:
      'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  },
  IN_TRANSIT: {
    label: 'In Transit',
    className:
      'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
  },
  COMPLETED: {
    label: 'Completed',
    className:
      'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  },
  CANCELLED: {
    label: 'Cancelled',
    className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  },
  REJECTED: {
    label: 'Rejected',
    className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  },
  FAILED: {
    label: 'Failed',
    className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  },
};

// ============================================================
// Priority
// ============================================================

const priorityMap: Record<
  RequestPriority,
  { label: string; className: string }
> = {
  LOW: {
    label: 'Low',
    className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  },
  MEDIUM: {
    label: 'Medium',
    className:
      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  },
  HIGH: {
    label: 'High',
    className:
      'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  },
  CRITICAL: {
    label: 'Critical',
    className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  },
};

// ============================================================
// Inventory Status
// ============================================================

const inventoryStatusMap: Record<
  InventoryStatus,
  { label: string; className: string }
> = {
  AVAILABLE: {
    label: 'Available',
    className:
      'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  },
  RESERVED: {
    label: 'Reserved',
    className:
      'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  },
  UNAVAILABLE: {
    label: 'Unavailable',
    className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  },
  MAINTENANCE: {
    label: 'Maintenance',
    className:
      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  },
  EXPIRED: {
    label: 'Expired',
    className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  },
  DEPLETED: {
    label: 'Depleted',
    className:
      'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  },
};

// ============================================================
// Facility Status
// ============================================================

const facilityStatusMap: Record<
  FacilityStatus,
  { label: string; className: string }
> = {
  ACTIVE: {
    label: 'Active',
    className:
      'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  },
  INACTIVE: {
    label: 'Inactive',
    className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  },
  SUSPENDED: {
    label: 'Suspended',
    className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  },
};

// ============================================================
// Onboarding Status
// ============================================================

const onboardingStatusMap: Record<
  OnboardingRequestStatus,
  { label: string; className: string }
> = {
  PENDING: {
    label: 'Pending',
    className:
      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  },
  APPROVED: {
    label: 'Approved',
    className:
      'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  },
  REJECTED: {
    label: 'Rejected',
    className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  },
};

// ============================================================
// User Status
// ============================================================

const userStatusMap: Record<UserStatus, { label: string; className: string }> =
  {
    PENDING_APPROVAL: {
      label: 'Pending',
      className:
        'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    },
    ACTIVE: {
      label: 'Active',
      className:
        'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    },
    LOCKED: {
      label: 'Locked',
      className:
        'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    },
    SUSPENDED: {
      label: 'Suspended',
      className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    },
    DEACTIVATED: {
      label: 'Deactivated',
      className:
        'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    },
  };

// ============================================================
// Badge components
// ============================================================

function StatusBadge({
  label,
  className,
}: {
  label: string;
  className: string;
}) {
  return (
    <Badge className={cn('border-0 text-xs font-medium', className)}>
      {label}
    </Badge>
  );
}

export function RequestStatusBadge({ status }: { status: RequestStatus }) {
  const config = requestStatusMap[status];
  return <StatusBadge {...config} />;
}

export function PriorityBadge({ priority }: { priority: RequestPriority }) {
  const config = priorityMap[priority];
  return <StatusBadge {...config} />;
}

export function InventoryStatusBadge({ status }: { status: InventoryStatus }) {
  const config = inventoryStatusMap[status];
  return <StatusBadge {...config} />;
}

export function FacilityStatusBadge({ status }: { status: FacilityStatus }) {
  const config = facilityStatusMap[status];
  return <StatusBadge {...config} />;
}

export function OnboardingStatusBadge({
  status,
}: {
  status: OnboardingRequestStatus;
}) {
  const config = onboardingStatusMap[status];
  return <StatusBadge {...config} />;
}

export function UserStatusBadge({ status }: { status: UserStatus }) {
  const config = userStatusMap[status];
  return <StatusBadge {...config} />;
}
