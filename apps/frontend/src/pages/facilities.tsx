import { useState } from 'react';
import { Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { Search, MapPin, Phone, Mail } from 'lucide-react';

import {
  useFacilities,
  useFacility,
} from '@/features/facilities/hooks/use-facilities';
import { PageHeader } from '@/components/shared/page-header';
import { FacilityStatusBadge } from '@/components/shared/status-badge';
import { EmptyState } from '@/components/shared/empty-state';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Building2 } from 'lucide-react';
import type { FacilityType } from '@/types';

const TYPE_LABELS: Record<FacilityType, string> = {
  HOSPITAL: 'Hospital',
  PHARMACY: 'Pharmacy',
  BLOOD_BANK: 'Blood Bank',
  PPE_SUPPLIER: 'PPE Supplier',
};

const TYPE_COLORS: Record<FacilityType, string> = {
  HOSPITAL: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  PHARMACY:
    'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  BLOOD_BANK: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  PPE_SUPPLIER:
    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
};

// ============================================================
// Facilities directory list
// ============================================================

function FacilitiesList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const { data: facilities = [], isLoading } = useFacilities();

  const filtered = facilities.filter(
    (f) =>
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.region.toLowerCase().includes(search.toLowerCase()) ||
      f.district.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Facilities"
        description="Network facilities directory"
      />

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search facilities..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No facilities found"
          description={
            search
              ? 'Try a different search term'
              : 'No facilities in the network yet'
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((facility) => (
            <Card
              key={facility.id}
              className="cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => navigate(`/facilities/${facility.id}`)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{facility.name}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <Badge
                        className={`border-0 text-xs ${TYPE_COLORS[facility.type]}`}
                      >
                        {TYPE_LABELS[facility.type]}
                      </Badge>
                      <FacilityStatusBadge status={facility.status} />
                    </div>
                  </div>
                </div>

                <div className="mt-4 space-y-1.5 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">
                      {facility.district}, {facility.region}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 shrink-0" />
                    <span>{facility.phone}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Facility profile detail
// ============================================================

function FacilityProfile() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { data: facility, isLoading } = useFacility(id ?? '');

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!facility) {
    return (
      <EmptyState
        icon={Building2}
        title="Facility not found"
        action={
          <Button variant="outline" onClick={() => navigate('/facilities')}>
            Back to directory
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={facility.name}
        action={
          <Button variant="outline" onClick={() => navigate('/facilities')}>
            ← Back
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Details card */}
        <Card className="lg:col-span-2">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                <Building2 className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">{facility.name}</h2>
                <div className="mt-1 flex gap-2">
                  <Badge
                    className={`border-0 text-xs ${TYPE_COLORS[facility.type]}`}
                  >
                    {TYPE_LABELS[facility.type]}
                  </Badge>
                  <FacilityStatusBadge status={facility.status} />
                </div>
              </div>
            </div>

            <Separator className="my-5" />

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Contact
                </p>
                <div className="mt-2 space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{facility.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{facility.phone}</span>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Location
                </p>
                <div className="mt-2 space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div>
                      <p>
                        {facility.district}, {facility.region}
                      </p>
                      {facility.addressLine && (
                        <p className="text-muted-foreground">
                          {facility.addressLine}
                        </p>
                      )}
                    </div>
                  </div>
                  <p className="font-mono text-xs text-muted-foreground">
                    {facility.latitude.toFixed(4)},{' '}
                    {facility.longitude.toFixed(4)}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick info */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Facility ID
              </p>
              <p className="mt-1 font-mono text-xs break-all text-muted-foreground">
                {facility.id}
              </p>
            </div>
            <Separator />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Added
              </p>
              <p className="mt-1 text-sm">
                {new Date(facility.createdAt).toLocaleDateString()}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ============================================================
// Router
// ============================================================

export default function FacilitiesPage() {
  return (
    <Routes>
      <Route index element={<FacilitiesList />} />
      <Route path=":id" element={<FacilityProfile />} />
    </Routes>
  );
}
