import { useState } from 'react';

import { useOnboardingRequests } from '@/features/admin/hooks/use-onboarding';
import { ApprovalsTable } from '@/features/admin/components/approvals-table';
import { PageHeader } from '@/components/shared/page-header';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { OnboardingRequestStatus } from '@/types';

export default function FacilityApprovalsPage() {
  const [activeTab, setActiveTab] = useState<OnboardingRequestStatus | 'ALL'>(
    'ALL'
  );

  const { data: requests = [], isLoading } = useOnboardingRequests(
    activeTab === 'ALL' ? undefined : activeTab
  );

  const pending = requests.filter((r) => r.status === 'PENDING').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Facility Approvals"
        description="Review and action pending onboarding requests"
      />

      <Tabs
        value={activeTab}
        onValueChange={(v) =>
          setActiveTab(v as OnboardingRequestStatus | 'ALL')
        }
      >
        <TabsList>
          <TabsTrigger value="ALL">
            All
            {pending > 0 && (
              <span className="ml-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white">
                {pending}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="PENDING">Pending</TabsTrigger>
          <TabsTrigger value="APPROVED">Approved</TabsTrigger>
          <TabsTrigger value="REJECTED">Rejected</TabsTrigger>
        </TabsList>
      </Tabs>

      <ApprovalsTable requests={requests} isLoading={isLoading} />
    </div>
  );
}
