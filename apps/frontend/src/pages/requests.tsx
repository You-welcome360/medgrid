import { Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { Plus } from 'lucide-react';

import {
  useRequests,
  useRequest,
} from '@/features/requests/hooks/use-requests';
import { RequestsTable } from '@/features/requests/components/requests-table';
import { RequestDetail } from '@/features/requests/components/request-detail';
import { CreateRequestForm } from '@/features/requests/components/create-request-form';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useRole } from '@/hooks/use-role';
import type { RequestStatus } from '@/types';
import { useState } from 'react';

// ============================================================
// List view
// ============================================================

function RequestsList() {
  const navigate = useNavigate();
  const { isCoordinationManager } = useRole();
  const [activeTab, setActiveTab] = useState<RequestStatus | 'ALL'>('ALL');

  const { data: requests = [], isLoading } = useRequests(
    activeTab === 'ALL' ? undefined : activeTab
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Requests"
        description="Resource coordination requests"
        action={
          isCoordinationManager ? (
            <Button onClick={() => navigate('/requests/new')}>
              <Plus className="mr-2 h-4 w-4" />
              Create Request
            </Button>
          ) : undefined
        }
      />

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as RequestStatus | 'ALL')}
      >
        <TabsList>
          <TabsTrigger value="ALL">All</TabsTrigger>
          <TabsTrigger value="PENDING">Pending</TabsTrigger>
          <TabsTrigger value="ACCEPTED">Accepted</TabsTrigger>
          <TabsTrigger value="IN_TRANSIT">In Transit</TabsTrigger>
          <TabsTrigger value="COMPLETED">Completed</TabsTrigger>
        </TabsList>
      </Tabs>

      <RequestsTable requests={requests} isLoading={isLoading} />
    </div>
  );
}

// ============================================================
// Detail view
// ============================================================

function RequestDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { data: request, isLoading } = useRequest(id ?? '');

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        Request not found.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Request #${request.id.slice(0, 8)}`}
        action={
          <Button variant="outline" onClick={() => navigate('/requests')}>
            ← Back to requests
          </Button>
        }
      />
      <RequestDetail request={request} />
    </div>
  );
}

// ============================================================
// Create view
// ============================================================

function CreateRequestPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Request"
        description="Request resources from another facility"
        action={
          <Button variant="outline" onClick={() => navigate('/requests')}>
            ← Back
          </Button>
        }
      />
      <div className="max-w-2xl">
        <CreateRequestForm />
      </div>
    </div>
  );
}

// ============================================================
// Router
// ============================================================

export default function RequestsPage() {
  return (
    <Routes>
      <Route index element={<RequestsList />} />
      <Route path="new" element={<CreateRequestPage />} />
      <Route path=":id" element={<RequestDetailPage />} />
    </Routes>
  );
}
