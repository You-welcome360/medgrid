import { useState } from 'react';
import {
  Radio,
  Flame,
  MapPin,
  Activity,
  Phone,
  Mail,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Globe,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

import { useBroadcasts, useAcceptBroadcast, useDeclineBroadcast } from '@/features/requests/hooks/use-requests';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/shared/page-header';
import { Separator } from '@/components/ui/separator';

export default function SOSDashboard() {
  const [ignoreRadius, setIgnoreRadius] = useState(false);
  const { data: broadcasts, isLoading } = useBroadcasts(ignoreRadius);
  const acceptMutation = useAcceptBroadcast();
  const declineMutation = useDeclineBroadcast();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedBroadcast = broadcasts?.find((b) => b.id === selectedId) || null;

  return (
    <div className="space-y-6 p-6 min-h-[calc(100vh-4rem)] bg-gray-950 text-gray-100 rounded-xl border border-red-950/40">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <PageHeader
          title="SOS Network Directory"
          description="Real-time emergency broadcast signals within coordinate range."
        />
        <div className="flex items-center gap-3">
          {/* Show All toggle */}
          <button
            onClick={() => { setIgnoreRadius((v) => !v); setSelectedId(null); }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all duration-300 ${
              ignoreRadius
                ? 'bg-blue-900/30 border-blue-500/50 text-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.2)]'
                : 'bg-gray-900/40 border-gray-700 text-gray-400 hover:border-blue-700/50 hover:text-blue-400'
            }`}
          >
            <Globe className="h-4 w-4" />
            {ignoreRadius ? 'All Network (Radius Off)' : 'Nearby Only (Radius On)'}
          </button>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-950/20 border border-red-900/30 text-red-400 text-sm font-medium animate-pulse">
            <Radio className="h-4 w-4" />
            Live SOS Scan Active
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Signals List */}
        <div className="lg:col-span-1 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2 text-gray-200">
            <Flame className="h-5 w-5 text-red-500" />
            Active Signals ({broadcasts?.length ?? 0})
            {ignoreRadius && (
              <span className="ml-auto text-xs font-normal text-blue-400 bg-blue-950/20 border border-blue-900/30 px-2 py-0.5 rounded-full">
                Network-wide
              </span>
            )}
          </h2>
          <Separator className="bg-gray-800" />

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-28 w-full bg-gray-900/60 rounded-xl border border-gray-800 animate-pulse" />
              ))}
            </div>
          ) : !broadcasts || broadcasts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-gray-800 rounded-xl bg-gray-900/10">
              <div className="relative mb-4">
                <div className="absolute inset-0 rounded-full bg-red-950/20 animate-ping" />
                <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-red-950/30 text-red-500 border border-red-900/40">
                  <Radio className="h-6 w-6" />
                </div>
              </div>
              <p className="text-gray-400 font-medium">No SOS Broadcasts detected</p>
              <p className="text-sm text-gray-600 mt-1 max-w-[200px]">
                {ignoreRadius
                  ? 'No active broadcasts across the entire network.'
                  : 'Listening for live network distress signals...'}
              </p>
              {!ignoreRadius && (
                <button
                  onClick={() => setIgnoreRadius(true)}
                  className="mt-4 text-xs text-blue-400 underline underline-offset-2 hover:text-blue-300 transition-colors"
                >
                  Show all network broadcasts instead
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {broadcasts.map((b) => {
                const isSelected = b.id === selectedId;
                return (
                  <div
                    key={b.id}
                    onClick={() => setSelectedId(b.id)}
                    className={`relative cursor-pointer group p-4 rounded-xl border transition-all duration-300 ${
                      isSelected
                        ? 'bg-red-950/20 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.15)]'
                        : 'bg-gray-900/40 border-gray-800/80 hover:bg-gray-900/80 hover:border-red-900/50'
                    }`}
                  >
                    {/* Pulsing indicator */}
                    <div className="absolute top-4 right-4 flex h-3.5 w-3.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500"></span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive" className="bg-red-500 hover:bg-red-600 text-xs px-2 py-0.5">
                          {b.priority}
                        </Badge>
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(b.requestedAt))} ago
                        </span>
                      </div>

                      <h3 className="font-semibold text-gray-100 group-hover:text-red-400 transition-colors">
                        {b.quantity} {b.unit} of {b.itemName}
                      </h3>

                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-gray-500" />
                          {b.distance !== undefined ? `${b.distance.toFixed(1)} km` : 'Local'}
                        </span>
                        <span className="text-gray-600">|</span>
                        <span className="truncate max-w-[120px]">
                          {b.requestingFacilityName}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Signal Panel */}
        <div className="lg:col-span-2">
          {selectedBroadcast ? (
            <Card className="bg-gray-900/30 border-gray-800 text-gray-100 overflow-hidden shadow-2xl">
              {/* Header card glow */}
              <div className="h-1.5 w-full bg-gradient-to-r from-red-500 via-orange-500 to-red-500" />
              <CardHeader className="p-6 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className="bg-red-950/50 border border-red-500/30 text-red-400 hover:bg-red-900/30">
                        SOS SIGNAL
                      </Badge>
                      <Badge variant="destructive">
                        {selectedBroadcast.priority} PRIORITY
                      </Badge>
                    </div>
                    <CardTitle className="text-2xl font-bold mt-2">
                      {selectedBroadcast.quantity} {selectedBroadcast.unit} {selectedBroadcast.itemName}
                    </CardTitle>
                    <CardDescription className="text-gray-400 text-sm">
                      Distress beacon active since {new Date(selectedBroadcast.requestedAt).toLocaleString()}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-6">
                {/* Details Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column: Request details */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
                      Request Description
                    </h3>
                    <p className="text-gray-300 text-sm leading-relaxed bg-gray-950/50 p-4 rounded-xl border border-gray-800">
                      {selectedBroadcast.description}
                    </p>

                    {selectedBroadcast.patient && (
                      <div className="space-y-2">
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
                          Clinical Context
                        </h3>
                        <div className="bg-red-950/10 p-4 rounded-xl border border-red-900/20 space-y-2 text-sm text-red-200">
                          <div className="flex items-center gap-2">
                            <Activity className="h-4 w-4 text-red-400" />
                            <span className="font-semibold">Trauma/Emergency Patient Details</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs text-red-300">
                            <div>
                              <span className="text-red-400">Condition:</span>{' '}
                              {(selectedBroadcast.patient as any).condition || 'Severe'}
                            </div>
                            <div>
                              <span className="text-red-400">Blood Type:</span>{' '}
                              {(selectedBroadcast.patient as any).bloodType || 'N/A'}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Facility Details */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
                      Requesting Facility
                    </h3>
                    <div className="bg-gray-950/30 p-4 rounded-xl border border-gray-800 space-y-3 text-sm">
                      <div className="font-bold text-gray-200 text-base">
                        {selectedBroadcast.requestingFacilityName}
                      </div>
                      <div className="text-gray-400 flex items-center gap-2">
                        <MapPin className="h-4 w-4 shrink-0 text-gray-500" />
                        <span>
                          {selectedBroadcast.requestingFacilityRegion},{' '}
                          {selectedBroadcast.requestingFacilityDistrict} (
                          {selectedBroadcast.distance !== undefined
                            ? `${selectedBroadcast.distance.toFixed(2)} km away`
                            : 'distance unknown'})
                        </span>
                      </div>
                      <Separator className="bg-gray-800/60" />
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-gray-300">
                          <Phone className="h-4 w-4 shrink-0 text-gray-500" />
                          <span>{selectedBroadcast.requestingFacilityPhone}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-300">
                          <Mail className="h-4 w-4 shrink-0 text-gray-500" />
                          <span>{selectedBroadcast.requestingFacilityEmail}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator className="bg-gray-800" />

                {/* Accept/Decline action buttons */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      declineMutation.mutate(selectedBroadcast.id, {
                        onSuccess: () => setSelectedId(null),
                      });
                    }}
                    disabled={declineMutation.isPending || acceptMutation.isPending}
                    className="text-gray-400 hover:text-white hover:bg-gray-800/50"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Dismiss Signal
                  </Button>

                  <Button
                    onClick={() => {
                      acceptMutation.mutate(selectedBroadcast.id, {
                        onSuccess: () => setSelectedId(null),
                      });
                    }}
                    disabled={acceptMutation.isPending || declineMutation.isPending}
                    className="bg-red-600 hover:bg-red-700 text-white font-medium shadow-[0_0_20px_rgba(239,68,68,0.3)] hover:shadow-[0_0_25px_rgba(239,68,68,0.5)] transition-all duration-300"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    {acceptMutation.isPending ? 'Claiming SOS...' : 'Accept SOS & Dispatch'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 border border-gray-800 rounded-xl bg-gray-900/10 min-h-[400px]">
              <AlertTriangle className="h-10 w-10 text-gray-600 mb-4" />
              <p className="text-gray-400 font-medium">No Signal Selected</p>
              <p className="text-sm text-gray-600 mt-1 max-w-[280px]">
                Click an active SOS distress signal from the list to view facility information, coordinates, and accept dispatch.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
