import { PageHeader } from '@/components/shared/page-header';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Overview of your facility's activity"
      />
      <p className="text-muted-foreground text-sm">Coming soon.</p>
    </div>
  );
}
