import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

import {
  useBroadcasts,
  useAcceptBroadcast,
  useDeclineBroadcast,
} from '@/features/requests/hooks/use-requests';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/shared/page-header';
import { Separator } from '@/components/ui/separator';

export default function SOSDashboard() {
  const navigate = useNavigate();
  const [ignoreRadius, setIgnoreRadius] = useState(false);
  const { data: broadcasts, isLoading } = useBroadcasts(ignoreRadius);
  const acceptMutation = useAcceptBroadcast();
  const declineMutation = useDeclineBroadcast();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedBroadcast =
    broadcasts?.find((b) => b.id === selectedId) || null;

  return (
    <div className="space-y-6 p-6 min-h-[calc(100vh-4rem)] bg-card text-card-foreground rounded-xl border border-border">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <PageHeader
          title="SOS Network Directory"
          description="Real-time emergency broadcast signals within coordinate range."
        />
        <div className="flex items-center gap-3">
          {/* Show All toggle */}
          <button
            onClick={() => {
              setIgnoreRadius((v) => !v);
              setSelectedId(null);
            }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all duration-300 ${
              ignoreRadius
                ? 'bg-blue-50 border-blue-200 text-blue-600 shadow-[0_0_12px_rgba(59,130,246,0.1)]'
                : 'bg-muted border-border text-muted-foreground hover:border-blue-400 hover:text-blue-600'
            }`}
          >
            <Globe className="h-4 w-4" />
            {ignoreRadius
              ? 'All Network (Radius Off)'
              : 'Nearby Only (Radius On)'}
          </button>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm font-medium animate-pulse">
            <Radio className="h-4 w-4" />
            Live SOS Scan Active
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Signals List */}
        <div className="lg:col-span-1 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2 text-foreground">
            <Flame className="h-5 w-5 text-red-500" />
            Active Signals ({broadcasts?.length ?? 0})
            {ignoreRadius && (
              <span className="ml-auto text-xs font-normal text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                Network-wide
              </span>
            )}
          </h2>
          <Separator className="bg-border" />

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="h-28 w-full bg-muted/50 rounded-xl border border-border animate-pulse"
                />
              ))}
            </div>
          ) : !broadcasts || broadcasts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-border rounded-xl bg-muted/10">
              <div className="relative mb-4">
                <div className="absolute inset-0 rounded-full bg-red-100 animate-ping" />
                <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500 border border-red-200">
                  <Radio className="h-6 w-6" />
                </div>
              </div>
              <p className="text-muted-foreground font-medium">
                No SOS Broadcasts detected
              </p>
              <p className="text-sm text-slate-400 mt-1 max-w-[200px]">
                {ignoreRadius
                  ? 'No active broadcasts across the entire network.'
                  : 'Listening for live network distress signals...'}
              </p>
              {!ignoreRadius && (
                <button
                  onClick={() => setIgnoreRadius(true)}
                  className="mt-4 text-xs text-blue-600 underline underline-offset-2 hover:text-blue-700 transition-colors"
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
                        ? 'bg-red-50/40 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.08)]'
                        : 'bg-background border-border hover:bg-slate-50/50 hover:border-red-400/60'
                    }`}
                  >
                    {/* Pulsing indicator */}
                    <div className="absolute top-4 right-4 flex h-3.5 w-3.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500"></span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="destructive"
                          className="bg-red-500 hover:bg-red-600 text-xs px-2 py-0.5"
                        >
                          {b.priority}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(b.requestedAt))} ago
                        </span>
                      </div>

                      <h3 className="font-semibold text-foreground group-hover:text-red-600 transition-colors">
                        {b.quantity} {b.unit} of {b.itemName}
                      </h3>

                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                          {b.distance !== undefined
                            ? `${b.distance.toFixed(1)} km`
                            : 'Local'}
                        </span>
                        <span className="text-border">|</span>
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
            <Card className="bg-card border-border text-card-foreground overflow-hidden shadow-lg">
              {/* Header card glow */}
              <div className="h-1.5 w-full bg-gradient-to-r from-red-500 via-orange-500 to-red-500" />
              <CardHeader className="p-6 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className="bg-red-50 border border-red-200 text-red-600 hover:bg-red-100">
                        SOS SIGNAL
                      </Badge>
                      <Badge variant="destructive">
                        {selectedBroadcast.priority} PRIORITY
                      </Badge>
                    </div>
                    <CardTitle className="text-2xl font-bold mt-2">
                      {selectedBroadcast.quantity} {selectedBroadcast.unit}{' '}
                      {selectedBroadcast.itemName}
                    </CardTitle>
                    <CardDescription className="text-muted-foreground text-sm">
                      Distress beacon active since{' '}
                      {new Date(selectedBroadcast.requestedAt).toLocaleString()}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-6">
                {/* Details Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column: Request details */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                      Request Description
                    </h3>
                    <p className="text-slate-700 text-sm leading-relaxed bg-muted/40 p-4 rounded-xl border border-border">
                      {selectedBroadcast.description}
                    </p>

                    {selectedBroadcast.patient && (
                      <div className="space-y-2">
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                          Clinical Context
                        </h3>
                        <div className="bg-red-50 p-4 rounded-xl border border-red-250/15 space-y-2 text-sm text-red-800">
                          <div className="flex items-center gap-2">
                            <Activity className="h-4 w-4 text-red-600" />
                            <span className="font-semibold text-red-950">
                              Trauma/Emergency Patient Details
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs text-red-700">
                            <div>
                              <span className="text-red-600">Condition:</span>{' '}
                              {(
                                selectedBroadcast.patient as {
                                  condition?: string;
                                }
                              )?.condition || 'Severe'}
                            </div>
                            <div>
                              <span className="text-red-600">Blood Type:</span>{' '}
                              {(
                                selectedBroadcast.patient as {
                                  bloodType?: string;
                                }
                              )?.bloodType || 'N/A'}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Facility Details */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                      Requesting Facility
                    </h3>
                    <div className="bg-muted/30 p-4 rounded-xl border border-border space-y-3 text-sm">
                      <div className="font-bold text-foreground text-base flex items-center gap-2 flex-wrap">
                        {selectedBroadcast.requestingFacilityName}
                        {selectedBroadcast.requestingFacilityType && (
                          <Badge
                            variant="outline"
                            className="text-[10px] uppercase font-semibold border-muted-foreground/30 text-muted-foreground px-1.5 py-0"
                          >
                            {selectedBroadcast.requestingFacilityType.replace(
                              /_/g,
                              ' '
                            )}
                          </Badge>
                        )}
                      </div>
                      <div className="text-muted-foreground flex items-center gap-2">
                        <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span>
                          {selectedBroadcast.requestingFacilityRegion},{' '}
                          {selectedBroadcast.requestingFacilityDistrict} (
                          {selectedBroadcast.distance !== undefined
                            ? `${selectedBroadcast.distance.toFixed(2)} km away`
                            : 'distance unknown'}
                          )
                        </span>
                      </div>
                      <Separator className="bg-border/60" />
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-foreground">
                          <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span>
                            {selectedBroadcast.requestingFacilityPhone}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-foreground">
                          <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span>
                            {selectedBroadcast.requestingFacilityEmail}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator className="bg-border" />

                {/* Accept/Decline action buttons */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      declineMutation.mutate(selectedBroadcast.id, {
                        onSuccess: () => setSelectedId(null),
                      });
                    }}
                    disabled={
                      declineMutation.isPending || acceptMutation.isPending
                    }
                    className="text-muted-foreground hover:text-foreground hover:bg-muted"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Dismiss Signal
                  </Button>

                  <Button
                    onClick={() => {
                      acceptMutation.mutate(selectedBroadcast.id, {
                        onSuccess: () => {
                          navigate(`/requests/${selectedBroadcast.id}`);
                        },
                      });
                    }}
                    disabled={
                      acceptMutation.isPending || declineMutation.isPending
                    }
                    className="bg-red-600 hover:bg-red-700 text-white font-medium shadow-[0_0_20px_rgba(239,68,68,0.3)] hover:shadow-[0_0_25px_rgba(239,68,68,0.5)] transition-all duration-300"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    {acceptMutation.isPending
                      ? 'Claiming SOS...'
                      : 'Accept SOS & Dispatch'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 border border-border rounded-xl bg-muted/5 min-h-[400px]">
              <AlertTriangle className="h-10 w-10 text-muted-foreground mb-4" />
              <p className="text-muted-foreground font-medium">
                No Signal Selected
              </p>
              <p className="text-sm text-slate-400 mt-1 max-w-[280px]">
                Click an active SOS distress signal from the list to view
                facility information, coordinates, and accept dispatch.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
