import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Phone,
  MapPin,
  Package,
  ArrowRight,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import {
  useNetworkResources,
  useNetworkFacilities,
} from '@/features/inventory/hooks/use-inventory';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { ResourceType } from '@/types';

const TYPE_LABELS: Record<string, string> = {
  BLOOD: 'Blood',
  PPE: 'PPE',
  MEDICATION: 'Medication',
  MEDICAL_EQUIPMENT: 'Equipment',
};

const TYPE_COLORS: Record<string, string> = {
  BLOOD: 'bg-red-50 text-red-700 border-red-200/50',
  PPE: 'bg-orange-50 text-orange-700 border-orange-200/50',
  MEDICATION: 'bg-blue-50 text-blue-700 border-blue-200/50',
  MEDICAL_EQUIPMENT: 'bg-violet-50 text-violet-700 border-violet-200/50',
};

export default function NetworkDirectoryPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selected, setSelected] = useState<{
    resourceType: ResourceType;
    itemName: string;
  } | null>(null);

  const { data: resources = [], isLoading: resourcesLoading } = useNetworkResources();

  const { data: facilities = [], isLoading: facilitiesLoading } = useNetworkFacilities(
    selected?.resourceType as ResourceType,
    selected?.itemName
  );

  const filteredResources = resources.filter((r) =>
    r.itemName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Real-Time Network Directory</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Monitor resource distribution and initiate inter-facility transfers.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Side: Resources Catalog */}
        <Card className="md:col-span-1 h-[calc(100vh-220px)] flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Resource Catalog</CardTitle>
            <div className="relative mt-2">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search resources..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto px-4 pb-4">
            {resourcesLoading ? (
              <div className="flex h-40 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredResources.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No resources found
              </div>
            ) : (
              <div className="space-y-2">
                {filteredResources.map((resource, i) => {
                  const isCurrent =
                    selected?.resourceType === resource.resourceType &&
                    selected?.itemName === resource.itemName;

                  return (
                    <button
                      key={i}
                      onClick={() =>
                        setSelected({
                          resourceType: resource.resourceType as ResourceType,
                          itemName: resource.itemName,
                        })
                      }
                      className={`w-full text-left rounded-lg border p-3 transition-colors ${
                        isCurrent
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-sm line-clamp-1">
                          {resource.itemName}
                        </span>
                        <Badge
                          variant="outline"
                          className={`shrink-0 text-[10px] uppercase font-bold tracking-wider ${
                            TYPE_COLORS[resource.resourceType] || ''
                          }`}
                        >
                          {TYPE_LABELS[resource.resourceType] ?? resource.resourceType}
                        </Badge>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          {resource.isMovable ? 'Movable Product' : 'Fixed Resource'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Side: Supplies directory */}
        <Card className="md:col-span-2 h-[calc(100vh-220px)] flex flex-col">
          <CardHeader className="pb-3 border-b">
            {selected ? (
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <span>Suppliers for: {selected.itemName}</span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] uppercase font-bold tracking-wider ${
                      TYPE_COLORS[selected.resourceType] || ''
                    }`}
                  >
                    {TYPE_LABELS[selected.resourceType] ?? selected.resourceType}
                  </Badge>
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Showing all facilities that hold available stock of this item.
                </p>
              </div>
            ) : (
              <div>
                <CardTitle className="text-base">Supplier Details</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Select an item from the left catalog to display supplying facilities.
                </p>
              </div>
            )}
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-0">
            {!selected ? (
              <div className="flex h-full flex-col items-center justify-center p-8 text-center">
                <Package className="h-10 w-10 text-muted-foreground mb-3 opacity-60" />
                <h3 className="font-semibold text-sm">No Resource Selected</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                  Choose a resource type or name from the catalog list to locate hosting facilities.
                </p>
              </div>
            ) : facilitiesLoading ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : facilities.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center p-8 text-center">
                <AlertCircle className="h-8 w-8 text-orange-500 mb-2" />
                <h3 className="font-semibold text-sm text-orange-700">Out of Stock</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                  There are currently no active, available quantities of this item in the network.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Facility</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead className="text-right">Available</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="w-28 text-right" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {facilities.map((item, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <div className="font-semibold text-sm">{item.facility.name}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wider font-medium">
                          {item.facility.type.replace('_', ' ')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-xs">
                          <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <span>
                            {item.facility.district}, {item.facility.region}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <Phone className="h-3 w-3 shrink-0" />
                            <span>{item.facility.phone}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {item.quantity.toLocaleString()}{' '}
                        <span className="text-[10px] font-normal text-muted-foreground">
                          {item.unit.toLowerCase()}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-sm">
                        {item.price !== undefined && item.price !== null
                          ? `$${item.price.toFixed(2)}`
                          : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          className="h-8 text-xs gap-1"
                          onClick={() =>
                            navigate('/requests/new', {
                              state: {
                                supplyingFacilityId: item.facilityId,
                                resourceType: item.resourceType,
                                itemName: item.itemName,
                              },
                            })
                          }
                        >
                          <span>Request</span>
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
