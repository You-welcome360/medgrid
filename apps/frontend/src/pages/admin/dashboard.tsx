import { Building2, Users, ClipboardList, TrendingUp } from 'lucide-react';

import { useOnboardingRequests } from '@/features/admin/hooks/use-onboarding';
import { useUsers } from '@/features/admin/hooks/use-users';
import { StatCard } from '@/features/dashboard/components/stat-card';
import { ApprovalsTable } from '@/features/admin/components/approvals-table';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserStatusBadge } from '@/components/shared/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';

export default function AdminDashboardPage() {
  const { data: allRequests = [], isLoading: requestsLoading } =
    useOnboardingRequests();
  const { data: users = [], isLoading: usersLoading } = useUsers();

  const pending = allRequests.filter((r) => r.status === 'PENDING');
  const approved = allRequests.filter((r) => r.status === 'APPROVED');
  const totalFacilities = approved.length;
  const activeUsers = users.filter((u) => u.status === 'ACTIVE').length;

  const isLoading = requestsLoading || usersLoading;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin Dashboard"
        description="Platform-wide overview"
      />

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Facilities"
          value={totalFacilities}
          subtitle="Approved and active"
          icon={Building2}
          iconColor="text-blue-500"
          isLoading={isLoading}
        />
        <StatCard
          title="Pending Approvals"
          value={pending.length}
          subtitle="Awaiting review"
          icon={ClipboardList}
          iconColor="text-orange-500"
          isLoading={isLoading}
        />
        <StatCard
          title="Total Users"
          value={users.length}
          subtitle={`${activeUsers} active`}
          icon={Users}
          iconColor="text-green-500"
          isLoading={isLoading}
        />
        <StatCard
          title="All Requests"
          value={allRequests.length}
          subtitle="Onboarding submissions"
          icon={TrendingUp}
          iconColor="text-purple-500"
          isLoading={isLoading}
        />
      </div>

      {/* Main grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Pending approvals — spans 2 cols */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-base font-semibold">Pending Approvals</h2>
          <ApprovalsTable requests={pending} isLoading={requestsLoading} />
        </div>

        {/* Recent users — spans 1 col */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Users</CardTitle>
          </CardHeader>
          <CardContent>
            {usersLoading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <div className="divide-y">
                {[...users]
                  .sort(
                    (a, b) =>
                      new Date(b.createdAt).getTime() -
                      new Date(a.createdAt).getTime()
                  )
                  .slice(0, 8)
                  .map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center gap-3 py-2.5"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                        {user.firstName[0]}
                        {user.lastName[0]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(user.createdAt), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                      <UserStatusBadge status={user.status} />
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
