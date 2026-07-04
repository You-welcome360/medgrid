import { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '@/hooks/use-auth';
import { useFacilities } from '@/features/facilities/hooks/use-facilities';
import { useRequests } from '@/features/requests/hooks/use-requests';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Phone, 
  Mail, 
  MapPin, 
  Navigation, 
  Activity, 
  Layers, 
  Filter, 
  X
} from 'lucide-react';

// Haversine formula to compute distance in km
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
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

// Facility pin color maps
const FACILITY_COLORS: Record<string, string> = {
  HOSPITAL: '#ef4444',     // Red
  BLOOD_BANK: '#3b82f6',   // Blue
  PHARMACY: '#10b981',     // Emerald
  PPE_SUPPLIER: '#f59e0b',  // Amber
};

// Route status line colors
const ROUTE_COLORS: Record<string, string> = {
  PENDING: '#f97316',    // Orange
  ACCEPTED: '#a855f7',   // Purple
  IN_TRANSIT: '#3b82f6',  // Blue
  COMPLETED: '#10b981',   // Green
};

export default function NetworkMapPage() {
  const { user } = useAuth();
  const { data: facilities = [] } = useFacilities();
  const { data: requests = [] } = useRequests();

  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const markersLayer = useRef<L.LayerGroup | null>(null);
  const routesLayer = useRef<L.LayerGroup | null>(null);

  // States
  const [selectedFacilityId, setSelectedFacilityId] = useState<string | null>(null);
  const [filterTypes, setFilterTypes] = useState<string[]>(['HOSPITAL', 'BLOOD_BANK', 'PHARMACY', 'PPE_SUPPLIER']);
  const [showRoutes, setShowRoutes] = useState(true);

  // Derive my facility coordinates
  const myFacility = useMemo(() => {
    return facilities.find((f) => f.id === user?.facilityId);
  }, [facilities, user?.facilityId]);

  // Selected Facility Details
  const selectedFacility = useMemo(() => {
    return facilities.find((f) => f.id === selectedFacilityId);
  }, [facilities, selectedFacilityId]);

  // Calculate requests involving this facility
  const activeRequests = useMemo(() => {
    if (!selectedFacilityId) return [];
    return requests.filter(
      (r) =>
        (r.requestingFacilityId === selectedFacilityId ||
          r.supplyingFacilityId === selectedFacilityId) &&
        ['PENDING', 'ACCEPTED', 'IN_TRANSIT'].includes(r.status)
    );
  }, [requests, selectedFacilityId]);

  // Initialize Map
  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;

    // Center of Ghana
    const defaultCenter: L.LatLngExpression = [7.9465, -1.0232];
    const defaultZoom = 7;

    const map = L.map(mapRef.current, {
      center: defaultCenter,
      zoom: defaultZoom,
      zoomControl: false,
      attributionControl: false,
    });

    // Dark-themed premium map tiles (CartoDB Dark Matter)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
    }).addTo(map);

    // Zoom control at bottom right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    leafletMap.current = map;
    markersLayer.current = L.layerGroup().addTo(map);
    routesLayer.current = L.layerGroup().addTo(map);

    return () => {
      map.remove();
      leafletMap.current = null;
    };
  }, []);

  // Update Markers & Supply Lines
  useEffect(() => {
    const map = leafletMap.current;
    const mLayer = markersLayer.current;
    const rLayer = routesLayer.current;
    if (!map || !mLayer || !rLayer) return;

    // Clear existing overlays
    mLayer.clearLayers();
    rLayer.clearLayers();

    // 1. Draw Facility Markers
    facilities.forEach((facility) => {
      if (!filterTypes.includes(facility.type)) return;

      const color = FACILITY_COLORS[facility.type] || '#4f46e5';
      const isMyFacility = facility.id === user?.facilityId;

      const markerHtml = `
        <div class="relative flex items-center justify-center w-8 h-8">
          ${
            isMyFacility
              ? `<div class="absolute w-8 h-8 rounded-full opacity-20 animate-ping bg-indigo-500"></div>`
              : `<div class="absolute w-6 h-6 rounded-full opacity-25 animate-pulse" style="background-color: ${color};"></div>`
          }
          <div class="relative w-6 h-6 rounded-full border-2 border-slate-900 flex items-center justify-center shadow-lg transition-transform duration-200 hover:scale-125" 
               style="background-color: ${color};">
            <span class="text-[9px] font-bold text-white">${facility.type.charAt(0)}</span>
          </div>
        </div>
      `;

      const icon = L.divIcon({
        html: markerHtml,
        className: 'custom-div-icon',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([facility.latitude, facility.longitude], { icon })
        .on('click', () => {
          setSelectedFacilityId(facility.id);
          map.setView([facility.latitude, facility.longitude], 10, { animate: true });
        });

      // Marker Tooltip
      marker.bindTooltip(
        `<div class="px-2 py-1 bg-slate-900 border border-slate-800 rounded shadow text-xs text-slate-100">
          <p class="font-semibold">${facility.name}</p>
          <p class="text-[10px] text-slate-400 capitalize">${facility.type.replace('_', ' ').toLowerCase()}</p>
        </div>`,
        { direction: 'top', offset: [0, -10] }
      );

      marker.addTo(mLayer);
    });

    // 2. Draw Supply Request Vectors
    if (showRoutes) {
      requests.forEach((req) => {
        if (!['PENDING', 'ACCEPTED', 'IN_TRANSIT', 'COMPLETED'].includes(req.status)) return;

        const requester = facilities.find((f) => f.id === req.requestingFacilityId);
        const supplier = facilities.find((f) => f.id === req.supplyingFacilityId);

        // A. Direct point-to-point lines
        if (requester && supplier) {
          const color = ROUTE_COLORS[req.status] || '#a855f7';
          const isTransit = req.status === 'IN_TRANSIT';

          const polyline = L.polyline(
            [
              [requester.latitude, requester.longitude],
              [supplier.latitude, supplier.longitude],
            ],
            {
              color,
              weight: isTransit ? 3 : 1.5,
              opacity: 0.8,
              dashArray: isTransit ? '8, 8' : undefined,
            }
          );

          // Route Details Tooltip
          polyline.bindTooltip(
            `<div class="px-2 py-1 bg-slate-900 border border-slate-800 rounded text-xs text-slate-100">
              <p class="font-semibold">${req.itemName} (Qty: ${req.quantity})</p>
              <p class="text-[10px] text-slate-400 capitalize">Status: ${req.status.replace('_', ' ').toLowerCase()}</p>
            </div>`,
            { sticky: true }
          );

          polyline.addTo(rLayer);
        }

        // B. Pulsing radar overlay for SOS broadcast requests (no supplier selected yet)
        if (req.isEmergency && req.status === 'PENDING' && requester) {
          const radar = L.circle([requester.latitude, requester.longitude], {
            radius: 12000, // 12km radius radar
            color: '#ef4444',
            fillColor: '#ef4444',
            fillOpacity: 0.05,
            weight: 1,
            className: 'animate-pulse',
          });

          radar.bindTooltip(
            `<div class="px-2 py-1 bg-red-950/90 border border-red-500/30 rounded text-xs text-red-100">
              <p class="font-semibold">⚠️ SOS BROADCAST</p>
              <p class="text-[10px] text-red-300 font-medium">${req.itemName} Needed</p>
            </div>`,
            { sticky: true }
          );

          radar.addTo(rLayer);
        }
      });
    }
  }, [facilities, requests, filterTypes, showRoutes, user?.facilityId]);

  // Center map on user's facility coordinates initially
  useEffect(() => {
    if (leafletMap.current && myFacility) {
      leafletMap.current.setView([myFacility.latitude, myFacility.longitude], 8, { animate: true });
    }
  }, [myFacility]);

  // Toggle filtering logic
  const handleToggleFilter = (type: string) => {
    setFilterTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const selectedDistance = useMemo(() => {
    if (!myFacility || !selectedFacility || myFacility.id === selectedFacility.id) return null;
    return calculateDistance(
      myFacility.latitude,
      myFacility.longitude,
      selectedFacility.latitude,
      selectedFacility.longitude
    );
  }, [myFacility, selectedFacility]);

  return (
    <div className="relative h-[calc(100vh-140px)] w-full rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950 flex animate-in fade-in duration-300">
      {/* Map Element */}
      <div ref={mapRef} className="h-full w-full z-0" />

      {/* Floating Header */}
      <div className="absolute top-4 left-4 z-10 bg-slate-950/80 backdrop-blur-md border border-slate-800/80 px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-3">
        <h3 className="text-slate-100 text-sm font-semibold">Network Map</h3>
        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
        <span className="text-[10px] font-medium text-slate-400">Live Supply Chain Node</span>
      </div>

      {/* Dynamic Overlay Panels - Right Side Floating Controls */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-4 max-w-sm w-full pointer-events-none">
        
        {/* Layer Filters Dashboard */}
        <Card className="border-slate-800/80 bg-slate-950/80 backdrop-blur-md shadow-2xl pointer-events-auto">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-2 text-slate-300 font-semibold text-xs border-b border-slate-800 pb-2">
              <Filter className="h-4.5 w-4.5 text-indigo-400" />
              <span>Map Overlay Filters</span>
            </div>

            {/* Toggle checkboxes */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              {Object.keys(FACILITY_COLORS).map((type) => {
                const color = FACILITY_COLORS[type];
                const active = filterTypes.includes(type);
                return (
                  <button
                    key={type}
                    onClick={() => handleToggleFilter(type)}
                    className={`flex items-center gap-2 p-1.5 rounded border text-left transition-all ${
                      active
                        ? 'border-slate-700 bg-slate-900/60 text-slate-200'
                        : 'border-slate-800/40 bg-slate-950/20 text-slate-500'
                    }`}
                  >
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                    <span className="truncate capitalize">{type.replace('_', ' ').toLowerCase()}s</span>
                  </button>
                );
              })}
            </div>

            {/* Route Toggles */}
            <div className="flex items-center justify-between text-xs border-t border-slate-800/60 pt-3">
              <span className="text-slate-400 flex items-center gap-1">
                <Layers className="h-3.5 w-3.5 text-indigo-400" /> Show Active Routes
              </span>
              <button
                onClick={() => setShowRoutes(!showRoutes)}
                className={`h-5 w-9 rounded-full transition-colors relative flex items-center ${
                  showRoutes ? 'bg-indigo-600' : 'bg-slate-800'
                }`}
              >
                <span
                  className={`h-4.5 w-4.5 rounded-full bg-white shadow transition-transform absolute ${
                    showRoutes ? 'translate-x-4' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Selected Facility Panel */}
        {selectedFacility && (
          <Card className="border-slate-800 bg-slate-950/90 backdrop-blur-md shadow-2xl border-t-2 pointer-events-auto transition-all animate-in slide-in-from-right-10"
                style={{ borderTopColor: FACILITY_COLORS[selectedFacility.type] }}>
            <CardContent className="p-4 space-y-4 relative">
              <button
                onClick={() => setSelectedFacilityId(null)}
                className="absolute top-3 right-3 text-slate-500 hover:text-slate-300"
              >
                <X className="h-4.5 w-4.5" />
              </button>

              <div>
                <h4 className="font-bold text-slate-100 text-sm leading-snug pr-6">
                  {selectedFacility.name}
                </h4>
                <p className="text-[10px] text-slate-400 capitalize mt-0.5 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full" 
                        style={{ backgroundColor: FACILITY_COLORS[selectedFacility.type] }} />
                  {selectedFacility.type.replace('_', ' ').toLowerCase()}
                </p>
              </div>

              {/* Haversine distance indicator */}
              {selectedDistance !== null && (
                <div className="bg-slate-900/60 border border-slate-800/60 p-2.5 rounded-lg flex items-center justify-between text-xs">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Navigation className="h-3.5 w-3.5 text-indigo-400" /> Distance from you
                  </span>
                  <span className="font-semibold text-slate-200 font-mono">
                    {selectedDistance.toFixed(1)} km
                  </span>
                </div>
              )}

              {/* Contact metadata */}
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center gap-2 text-slate-400">
                  <MapPin className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                  <span className="truncate">{selectedFacility.district}, {selectedFacility.region}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <Phone className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                  <span>{selectedFacility.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <Mail className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                  <span className="truncate">{selectedFacility.email}</span>
                </div>
              </div>

              {/* Active requests involving this facility */}
              <div className="border-t border-slate-800/60 pt-3">
                <h5 className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Activity className="h-3.5 w-3.5 text-indigo-400" /> Active request flows
                </h5>

                {activeRequests.length === 0 ? (
                  <p className="text-[10px] text-slate-500 italic">No active requests involving this facility.</p>
                ) : (
                  <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                    {activeRequests.map((req) => {
                      const isOutgoing = req.requestingFacilityId === selectedFacility.id;
                      return (
                        <div key={req.id} className="p-2 rounded border border-slate-800/40 bg-slate-900/20 text-xs flex justify-between items-center gap-2">
                          <div className="truncate">
                            <p className="font-medium text-slate-200 truncate">{req.itemName}</p>
                            <p className="text-[9px] text-slate-400 font-medium capitalize">
                              {isOutgoing ? 'Requesting out' : 'Supplying in'} • Qty: {req.quantity}
                            </p>
                          </div>
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-semibold uppercase shrink-0"
                                style={{ 
                                  backgroundColor: `${ROUTE_COLORS[req.status]}20`, 
                                  color: ROUTE_COLORS[req.status] 
                                }}>
                            {req.status.replace('_', ' ')}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
