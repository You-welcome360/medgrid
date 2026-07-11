import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Search,
  Phone,
  MapPin,
  Package,
  ArrowRight,
  Loader2,
  AlertCircle,
  Map,
  List,
  Navigation,
  Mail,
  X,
} from 'lucide-react';
import {
  useNetworkResources,
  useNetworkFacilities,
} from '@/features/inventory/hooks/use-inventory';
import { useAuth } from '@/hooks/use-auth';
import { useFacilities } from '@/features/facilities/hooks/use-facilities';
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
import type { ResourceType, NetworkFacilityItem } from '@/types';

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

const FACILITY_COLORS: Record<string, string> = {
  HOSPITAL: '#ef4444', // Red
  BLOOD_BANK: '#3b82f6', // Blue
  PHARMACY: '#10b981', // Emerald
  PPE_SUPPLIER: '#f59e0b', // Amber
};

// Haversine formula to compute distance in km
const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) => {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export default function NetworkDirectoryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: allFacilities = [] } = useFacilities();

  const [searchQuery, setSearchQuery] = useState('');
  const [selected, setSelected] = useState<{
    resourceType: ResourceType;
    itemName: string;
  } | null>(null);

  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [selectedMapItem, setSelectedMapItem] =
    useState<NetworkFacilityItem | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const markersLayer = useRef<L.LayerGroup | null>(null);

  const { data: resources = [], isLoading: resourcesLoading } =
    useNetworkResources();

  const { data: facilities = [], isLoading: facilitiesLoading } =
    useNetworkFacilities(
      selected?.resourceType as ResourceType,
      selected?.itemName
    );

  const filteredResources = resources.filter((r) =>
    r.itemName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // My facility coordinates lookup
  const myFacility = useMemo(() => {
    return allFacilities.find((f) => f.id === user?.facilityId);
  }, [allFacilities, user?.facilityId]);

  // Selected map item distance
  const selectedDistance = useMemo(() => {
    if (
      !myFacility ||
      !selectedMapItem ||
      myFacility.id === selectedMapItem.facilityId
    )
      return null;
    return calculateDistance(
      myFacility.latitude,
      myFacility.longitude,
      selectedMapItem.facility.latitude,
      selectedMapItem.facility.longitude
    );
  }, [myFacility, selectedMapItem]);

  // Map initialization and markers placement
  useEffect(() => {
    if (viewMode !== 'map' || !mapContainerRef.current) {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
        markersLayer.current = null;
      }
      return;
    }

    if (!leafletMap.current) {
      // Ghana Center
      const defaultCenter: L.LatLngExpression = [7.9465, -1.0232];
      const defaultZoom = 6;

      const map = L.map(mapContainerRef.current, {
        center: defaultCenter,
        zoom: defaultZoom,
        zoomControl: false,
        attributionControl: false,
      });

      L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        {
          maxZoom: 19,
        }
      ).addTo(map);

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      leafletMap.current = map;
      markersLayer.current = L.layerGroup().addTo(map);
    }

    const map = leafletMap.current;
    const mLayer = markersLayer.current;

    if (map && mLayer) {
      mLayer.clearLayers();

      const bounds: L.LatLngBoundsExpression = [];

      facilities.forEach((item) => {
        const color = FACILITY_COLORS[item.facility.type] || '#4f46e5';
        const isMyFacility = item.facilityId === user?.facilityId;

        const markerHtml = `
          <div class="relative flex items-center justify-center w-8 h-8">
            ${
              isMyFacility
                ? `<div class="absolute w-8 h-8 rounded-full opacity-20 animate-ping bg-primary"></div>`
                : `<div class="absolute w-6 h-6 rounded-full opacity-25 animate-pulse" style="background-color: ${color};"></div>`
            }
            <div class="relative w-6 h-6 rounded-full border-2 border-white flex items-center justify-center shadow-lg transition-transform duration-200 hover:scale-125" 
                 style="background-color: ${color};">
              <span class="text-[9px] font-bold text-white">${item.facility.type.charAt(0)}</span>
            </div>
          </div>
        `;

        const icon = L.divIcon({
          html: markerHtml,
          className: 'custom-div-icon',
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        const marker = L.marker(
          [item.facility.latitude, item.facility.longitude],
          { icon }
        ).on('click', () => {
          setSelectedMapItem(item);
          map.setView([item.facility.latitude, item.facility.longitude], 9, {
            animate: true,
          });
        });

        marker.bindTooltip(
          `<div class="px-2 py-1 bg-white border border-slate-200 rounded shadow text-xs text-slate-900">
            <p class="font-semibold">${item.facility.name}</p>
            <p class="text-[10px] text-slate-500">Available: ${item.quantity} ${item.unit.toLowerCase()}</p>
          </div>`,
          { direction: 'top', offset: [0, -10] }
        );

        marker.addTo(mLayer);
        bounds.push([item.facility.latitude, item.facility.longitude]);
      });

      // Fit map bounds to show all pins if they exist
      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [40, 40] });
      } else if (myFacility) {
        map.setView([myFacility.latitude, myFacility.longitude], 7);
      }
    }
  }, [viewMode, facilities, myFacility, user?.facilityId]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Real-Time Network Directory
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor resource distribution and initiate inter-facility transfers.
          </p>
        </div>

        {/* View Toggle Controls */}
        {selected && (
          <div className="flex bg-muted border border-border rounded-lg p-1 shrink-0 self-start md:self-auto">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                viewMode === 'list'
                  ? 'bg-primary text-primary-foreground shadow'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <List className="h-3.5 w-3.5" />
              List View
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                viewMode === 'map'
                  ? 'bg-primary text-primary-foreground shadow'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Map className="h-3.5 w-3.5" />
              Map View
            </button>
          </div>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Side: Resources Catalog */}
        <Card className="md:col-span-1 h-[calc(100vh-220px)] flex flex-col border-border bg-card shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-foreground">
              Resource Catalog
            </CardTitle>
            <div className="relative mt-2">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search resources..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 bg-background border-border text-foreground focus-visible:ring-primary"
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
                      onClick={() => {
                        setSelected({
                          resourceType: resource.resourceType as ResourceType,
                          itemName: resource.itemName,
                        });
                        setSelectedMapItem(null);
                      }}
                      className={`w-full text-left rounded-lg border p-3 transition-colors ${
                        isCurrent
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-sm line-clamp-1 text-foreground">
                          {resource.itemName}
                        </span>
                        <Badge
                          variant="outline"
                          className={`shrink-0 text-[10px] uppercase font-bold tracking-wider ${
                            TYPE_COLORS[resource.resourceType] || ''
                          }`}
                        >
                          {TYPE_LABELS[resource.resourceType] ??
                            resource.resourceType}
                        </Badge>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          {resource.isMovable
                            ? 'Movable Product'
                            : 'Fixed Resource'}
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
        <Card className="md:col-span-2 h-[calc(100vh-220px)] flex flex-col border-border bg-card shadow-sm">
          <CardHeader className="pb-3 border-b border-border">
            {selected ? (
              <div>
                <CardTitle className="text-base flex items-center gap-2 text-foreground">
                  <span>Suppliers for: {selected.itemName}</span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] uppercase font-bold tracking-wider ${
                      TYPE_COLORS[selected.resourceType] || ''
                    }`}
                  >
                    {TYPE_LABELS[selected.resourceType] ??
                      selected.resourceType}
                  </Badge>
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Showing all facilities that hold available stock of this item.
                </p>
              </div>
            ) : (
              <div>
                <CardTitle className="text-base text-foreground">
                  Supplier Details
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Select an item from the left catalog to display supplying
                  facilities.
                </p>
              </div>
            )}
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-0 relative">
            {!selected ? (
              <div className="flex h-full flex-col items-center justify-center p-8 text-center">
                <Package className="h-10 w-10 text-muted-foreground mb-3 opacity-60" />
                <h3 className="font-semibold text-sm text-foreground">
                  No Resource Selected
                </h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                  Choose a resource type or name from the catalog list to locate
                  hosting facilities.
                </p>
              </div>
            ) : facilitiesLoading ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : facilities.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center p-8 text-center">
                <AlertCircle className="h-8 w-8 text-orange-500 mb-2" />
                <h3 className="font-semibold text-sm text-orange-700">
                  Out of Stock
                </h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                  There are currently no active, available quantities of this
                  item in the network.
                </p>
              </div>
            ) : viewMode === 'list' ? (
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow className="border-border hover:bg-muted/20">
                    <TableHead className="text-muted-foreground">
                      Facility
                    </TableHead>
                    <TableHead className="text-muted-foreground">
                      Location
                    </TableHead>
                    <TableHead className="text-muted-foreground">
                      Contact
                    </TableHead>
                    <TableHead className="text-right text-muted-foreground">
                      Available
                    </TableHead>
                    <TableHead className="text-right text-muted-foreground">
                      Price
                    </TableHead>
                    <TableHead className="w-28 text-right text-muted-foreground" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {facilities.map((item, i) => (
                    <TableRow
                      key={i}
                      className="border-border hover:bg-muted/30"
                    >
                      <TableCell>
                        <div className="font-semibold text-sm text-foreground">
                          {item.facility.name}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wider font-semibold">
                          {item.facility.type.replace('_', ' ')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-xs text-foreground">
                          <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <span>
                            {item.facility.district}, {item.facility.region}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <Phone className="h-3 w-3 shrink-0 text-muted-foreground" />
                            <span>{item.facility.phone}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium text-foreground">
                        {item.quantity.toLocaleString()}{' '}
                        <span className="text-[10px] font-normal text-muted-foreground">
                          {item.unit.toLowerCase()}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-sm text-foreground">
                        {item.price !== undefined && item.price !== null
                          ? `₵${item.price.toFixed(2)}`
                          : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          className="h-8 text-xs gap-1 bg-primary hover:bg-primary/90 text-primary-foreground"
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
            ) : (
              /* Map View Container */
              <div className="relative h-full w-full">
                {/* Leaflet Mount */}
                <div ref={mapContainerRef} className="h-full w-full z-0" />

                {/* Selected Map Item Overlay Card */}
                {selectedMapItem && (
                  <div className="absolute top-4 left-4 right-4 md:left-auto md:right-4 z-10 max-w-sm w-full bg-card/95 backdrop-blur border border-border rounded-xl p-4 shadow-2xl transition-all animate-in slide-in-from-right-10 pointer-events-auto">
                    <button
                      onClick={() => setSelectedMapItem(null)}
                      className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4.5 w-4.5" />
                    </button>

                    <div>
                      <h4 className="font-bold text-foreground text-sm leading-snug pr-6">
                        {selectedMapItem.facility.name}
                      </h4>
                      <p className="text-[10px] text-muted-foreground capitalize mt-0.5 flex items-center gap-1">
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{
                            backgroundColor:
                              FACILITY_COLORS[selectedMapItem.facility.type] ||
                              '#4f46e5',
                          }}
                        />
                        {selectedMapItem.facility.type
                          .replace('_', ' ')
                          .toLowerCase()}
                      </p>
                    </div>

                    {/* Haversine distance indicator */}
                    {selectedDistance !== null && (
                      <div className="bg-muted border border-border p-2.5 rounded-lg flex items-center justify-between text-xs mt-3">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Navigation className="h-3.5 w-3.5 text-primary" />{' '}
                          Distance from you
                        </span>
                        <span className="font-semibold text-foreground font-mono">
                          {selectedDistance.toFixed(1)} km
                        </span>
                      </div>
                    )}

                    {/* Contact metadata */}
                    <div className="space-y-1.5 text-xs mt-3">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="truncate">
                          {selectedMapItem.facility.district},{' '}
                          {selectedMapItem.facility.region}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span>{selectedMapItem.facility.phone}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="truncate">
                          {selectedMapItem.facility.email}
                        </span>
                      </div>
                    </div>

                    {/* Availability details */}
                    <div className="border-t border-border/60 pt-3 mt-3 flex justify-between items-center text-xs">
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                          Available Stock
                        </p>
                        <p className="font-bold text-foreground text-sm mt-0.5">
                          {selectedMapItem.quantity.toLocaleString()}{' '}
                          {selectedMapItem.unit.toLowerCase()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                          Unit Cost
                        </p>
                        <p className="font-bold text-foreground text-sm mt-0.5">
                          {selectedMapItem.price !== null
                            ? `₵${selectedMapItem.price.toFixed(2)}`
                            : '—'}
                        </p>
                      </div>
                    </div>

                    {/* Trigger Request Redirect */}
                    <Button
                      className="w-full mt-4 bg-primary hover:bg-primary/90 text-primary-foreground gap-2 font-semibold text-xs"
                      onClick={() =>
                        navigate('/requests/new', {
                          state: {
                            supplyingFacilityId: selectedMapItem.facilityId,
                            resourceType: selectedMapItem.resourceType,
                            itemName: selectedMapItem.itemName,
                          },
                        })
                      }
                    >
                      <span>Request Resources</span>
                      <ArrowRight className="h-4.5 w-4.5" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
