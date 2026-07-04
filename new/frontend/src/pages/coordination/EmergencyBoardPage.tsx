import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Loader2, MapPin, Clock, AlertCircle, RefreshCw, Check } from 'lucide-react';
import { getNearbyRequests, acknowledgeRequest } from '@/services/coordinationService';
import { useSocketEvent } from '@/hooks/useSocket';
import type { NearbyRequest, UrgencyLevel } from '@/types';

const URGENCY_COLORS: Record<UrgencyLevel, string> = {
  critical: 'bg-red-50 text-red-700 border-red-200/60',
  high: 'bg-orange-50 text-orange-700 border-orange-200/60',
  medium: 'bg-amber-50 text-amber-700 border-amber-200/60',
  low: 'bg-slate-100 text-slate-500 border-slate-200',
};

const RADIUS_OPTIONS = [
  { label: '10 km', value: 10 },
  { label: '25 km', value: 25 },
  { label: '50 km', value: 50 },
  { label: '100 km', value: 100 },
];

function Countdown({ expiresAt }: { expiresAt: string | null }) {
  const [label, setLabel] = useState('');

  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) { setLabel('Expired'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setLabel(h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [expiresAt]);

  if (!expiresAt) return null;
  const isExpired = label === 'Expired';
  return (
    <span className={`font-mono text-xs font-bold ${isExpired ? 'text-red-500' : 'text-amber-600'}`}>
      {label}
    </span>
  );
}

export default function EmergencyBoardPage() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<NearbyRequest[]>([]);
  const [radius, setRadius] = useState(25);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acknowledging, setAcknowledging] = useState<string | null>(null);
  const [ackError, setAckError] = useState<string | null>(null);

  const user = (() => {
    try { return JSON.parse(localStorage.getItem('medgrid_user') || '{}'); } catch { return {}; }
  })();
  const myFacilityId = user.facility_id;

  const load = useCallback(async () => {
    setFetching(true);
    setError(null);
    setAckError(null);
    try {
      const data = await getNearbyRequests(radius);
      setRequests(data.requests);
    } catch (err: any) {
      if (err.message === 'Your facility does not have a location set. Please update your facility with latitude and longitude.') {
        setError('Your facility does not have GPS coordinates set. Ask a Super Admin to update your facility location.');
      } else {
        setError(err.message ?? 'Failed to load nearby requests');
      }
    } finally {
      setFetching(false);
    }
  }, [radius]);

  useEffect(() => { load(); }, [load]);

  // Live: new emergency requests trigger a refresh
  useSocketEvent('request:created', (data: any) => {
    if (data?.classification === 'emergency') load();
  });
  useSocketEvent('request:acknowledged', () => load());
  useSocketEvent('request:expired', () => load());

  const handleAcknowledge = async (id: string) => {
    setAcknowledging(id);
    setAckError(null);
    try {
      await acknowledgeRequest(id);
      // Update the card status inline
      setRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: 'acknowledged' } : r))
      );
    } catch (err: any) {
      setAckError(err.message ?? 'Failed to acknowledge');
    } finally {
      setAcknowledging(null);
    }
  };

  const active = requests.filter((r) => r.status !== 'expired' && new Date(r.expires_at ?? 0) > new Date());
  const expired = requests.filter((r) => r.status === 'expired' || (r.expires_at && new Date(r.expires_at) <= new Date()));

  return (
    <div className="space-y-6 text-slate-800">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Zap className="h-5 w-5 text-red-500" />
            Emergency Board
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Live emergency resource requests from nearby facilities. Acknowledge to commit to responding.
          </p>
        </div>
        <button
          onClick={load}
          disabled={fetching}
          className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${fetching ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Radius selector */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Search Radius</span>
        </div>
        <div className="flex rounded-xl overflow-hidden border border-slate-200 text-xs font-bold">
          {RADIUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setRadius(opt.value)}
              className={`px-4 py-2 transition-colors cursor-pointer ${
                radius === opt.value
                  ? 'bg-red-600 text-white'
                  : 'bg-white text-slate-500 hover:bg-slate-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-slate-400 font-medium">
          Showing requests within <strong className="text-slate-700">{radius} km</strong> of your facility
        </span>
      </div>

      {ackError && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl font-medium flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" /> {ackError}
        </div>
      )}

      {fetching ? (
        <div className="p-12 flex items-center justify-center gap-2 text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" /> Scanning nearby facilities...
        </div>
      ) : error ? (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 text-sm px-5 py-4 rounded-2xl font-medium flex items-start gap-3">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      ) : active.length === 0 && expired.length === 0 ? (
        <div className="bg-white border border-slate-200/60 rounded-2xl p-12 text-center shadow-sm">
          <Zap className="h-8 w-8 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-500">
            No active emergency requests within {radius} km.
          </p>
          <p className="text-xs text-slate-400 mt-1">The board updates automatically when new requests are broadcast.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Active cards */}
          {active.length > 0 && (
            <div className="space-y-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Active — {active.length} request{active.length !== 1 ? 's' : ''}
              </p>
              {active.map((req) => {
                const isOwn = req.facility_id === myFacilityId;
                const isAcked = req.status === 'acknowledged';
                return (
                  <div
                    key={req.id}
                    className={`bg-white border rounded-2xl p-5 shadow-sm transition-all ${
                      req.urgency_level === 'critical'
                        ? 'border-red-200 shadow-red-100/50'
                        : 'border-slate-200/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0 space-y-2">
                        {/* Top row */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${URGENCY_COLORS[req.urgency_level]}`}>
                            {req.urgency_level}
                          </span>
                          <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${
                            isAcked
                              ? 'bg-cyan-50 text-cyan-700 border-cyan-200/60'
                              : 'bg-blue-50 text-blue-700 border-blue-200/60'
                          }`}>
                            {req.status}
                          </span>
                          {isOwn && (
                            <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border bg-slate-100 text-slate-500 border-slate-200">
                              Your Request
                            </span>
                          )}
                        </div>

                        {/* Resource + Facility */}
                        <div>
                          <p className="font-bold text-slate-900 text-base">{req.resource_name}</p>
                          <p className="text-xs text-slate-500 font-medium mt-0.5">
                            from <span className="text-slate-700 font-semibold">{req.facility_name}</span>
                          </p>
                        </div>

                        {/* Stats row */}
                        <div className="flex items-center gap-5 text-xs text-slate-500 font-semibold flex-wrap">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-slate-400" />
                            {req.distance_km} km away
                          </span>
                          <span>
                            Qty: <span className="text-slate-800 font-bold">{req.quantity}</span>
                          </span>
                          {req.broadcast_radius_km && (
                            <span>Broadcast: {req.broadcast_radius_km} km</span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-amber-500" />
                            <Countdown expiresAt={req.expires_at} />
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-2 shrink-0">
                        {!isOwn && !isAcked && (
                          <button
                            onClick={() => handleAcknowledge(req.id)}
                            disabled={acknowledging === req.id}
                            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-cyan-700 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200/60 rounded-xl transition-all cursor-pointer disabled:opacity-50 whitespace-nowrap"
                          >
                            {acknowledging === req.id
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              : <Check className="h-3.5 w-3.5" />}
                            Acknowledge
                          </button>
                        )}
                        <button
                          onClick={() => navigate(`/coordination/requests/${req.id}`)}
                          className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all cursor-pointer whitespace-nowrap"
                        >
                          View Details →
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Expired section */}
          {expired.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Expired — {expired.length}
              </p>
              {expired.map((req) => (
                <div
                  key={req.id}
                  className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 opacity-60 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-600 text-sm">{req.resource_name}</p>
                    <p className="text-xs text-slate-400 font-medium">
                      {req.facility_name} · {req.distance_km} km · Qty {req.quantity}
                    </p>
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border bg-orange-50 text-orange-600 border-orange-200/60 shrink-0">
                    Expired
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
