import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Loader2, CheckCircle2, XCircle, Package,
  Clock, AlertCircle, Zap, Check, X,
} from 'lucide-react';
import {
  getRequestById,
  acknowledgeRequest,
  fulfillRequest,
  cancelRequest,
} from '@/services/coordinationService';
import { useSocketEvent } from '@/hooks/useSocket';
import type { CoordinationRequest, RequestStatus } from '@/types';

const STATUS_STEPS: RequestStatus[] = ['open', 'acknowledged', 'fulfilled'];

function StatusBadge({ status }: { status: RequestStatus }) {
  const map: Record<RequestStatus, string> = {
    open: 'bg-blue-50 text-blue-700 border-blue-200/60',
    acknowledged: 'bg-cyan-50 text-cyan-700 border-cyan-200/60',
    in_progress: 'bg-amber-50 text-amber-700 border-amber-200/60',
    fulfilled: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
    canceled: 'bg-slate-100 text-slate-500 border-slate-200',
    expired: 'bg-orange-50 text-orange-700 border-orange-200/60',
  };
  return (
    <span className={`text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded border ${map[status]}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

function TimeRemaining({ expiresAt }: { expiresAt: string | null }) {
  const [remaining, setRemaining] = useState('');
  useEffect(() => {
    if (!expiresAt) return;
    const update = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) { setRemaining('Expired'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(`${h}h ${m}m ${s}s`);
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [expiresAt]);
  if (!expiresAt) return null;
  return <span className="font-mono text-amber-600">{remaining}</span>;
}

export default function RequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [request, setRequest] = useState<CoordinationRequest | null>(null);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Action modals
  const [showFulfill, setShowFulfill] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Fulfill form
  const [pricePerUnit, setPricePerUnit] = useState('');
  const [quantityFulfilled, setQuantityFulfilled] = useState('');
  const [respondingFacilityId, setRespondingFacilityId] = useState('');

  const user = (() => { try { return JSON.parse(localStorage.getItem('medgrid_user') || '{}'); } catch { return {}; } })();
  const isSuperAdmin = user.role === 'SUPER_ADMIN';
  const myFacilityId = user.facility_id;

  const load = useCallback(async () => {
    if (!id) return;
    setFetching(true);
    setError(null);
    try {
      const data = await getRequestById(id);
      setRequest(data);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load request');
    } finally {
      setFetching(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // Live status updates
  useSocketEvent('request:acknowledged', (data: any) => { if (data?.request_id === id) load(); });
  useSocketEvent('request:fulfilled', (data: any) => { if (data?.request_id === id) load(); });
  useSocketEvent('request:canceled', (data: any) => { if (data?.request_id === id) load(); });

  const handleAcknowledge = async () => {
    if (!id) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await acknowledgeRequest(id);
      await load();
    } catch (err: any) {
      setActionError(err.message ?? 'Failed to acknowledge');
    } finally {
      setActionLoading(false);
    }
  };

  const handleFulfill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await fulfillRequest(id, {
        ...(pricePerUnit && { price_per_unit: parseFloat(pricePerUnit) }),
        ...(quantityFulfilled && { quantity_fulfilled: parseInt(quantityFulfilled, 10) }),
        ...(respondingFacilityId && { responding_facility_id: respondingFacilityId }),
      });
      setShowFulfill(false);
      await load();
    } catch (err: any) {
      setActionError(err.message ?? 'Failed to fulfill');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!id) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await cancelRequest(id);
      setShowCancel(false);
      await load();
    } catch (err: any) {
      setActionError(err.message ?? 'Failed to cancel');
    } finally {
      setActionLoading(false);
    }
  };

  if (fetching) return (
    <div className="p-12 flex items-center justify-center gap-2 text-slate-400">
      <Loader2 className="h-5 w-5 animate-spin" /> Loading request...
    </div>
  );

  if (error) return (
    <div className="p-8 text-center bg-red-50 border border-red-100 text-red-600 font-medium rounded-2xl">
      {error}
    </div>
  );

  if (!request) return null;

  const isOwn = request.facility_id === myFacilityId;
  const isEmergency = request.classification === 'emergency';
  const canAcknowledge = isEmergency && request.status === 'open' && !isOwn;
  // Normal: fulfill when open or in_progress (own or super admin)
  // Emergency: fulfill when acknowledged or in_progress (any facility or super admin)
  const canFulfill =
    !['fulfilled', 'canceled', 'expired'].includes(request.status) &&
    (isEmergency
      ? ['acknowledged', 'in_progress'].includes(request.status)
      : (isSuperAdmin || isOwn) && ['open', 'in_progress'].includes(request.status));
  const canCancel = (isOwn || isSuperAdmin) && ['open', 'in_progress', 'acknowledged'].includes(request.status);

  const stepIndex = STATUS_STEPS.indexOf(request.status as RequestStatus);

  return (
    <div className="space-y-6 text-slate-800 max-w-4xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/coordination/requests')} className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 transition-all shadow-sm cursor-pointer">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            {isEmergency ? <Zap className="h-5 w-5 text-red-500" /> : <Package className="h-5 w-5 text-emerald-600" />}
            {request.resource_name}
            <StatusBadge status={request.status} />
          </h2>
          <p className="text-xs text-slate-400 mt-0.5 font-mono">{request.id}</p>
        </div>
      </div>

      {/* Status Timeline (non-canceled/expired) */}
      {!['canceled', 'expired'].includes(request.status) && (
        <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Progress</p>
          <div className="flex items-center gap-0">
            {STATUS_STEPS.map((step, i) => {
              const done = stepIndex >= i;
              const active = stepIndex === i;
              return (
                <React.Fragment key={step}>
                  <div className="flex flex-col items-center gap-1">
                    <div className={`h-8 w-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all ${
                      done
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : active
                        ? 'bg-white border-emerald-500 text-emerald-600'
                        : 'bg-white border-slate-200 text-slate-400'
                    }`}>
                      {done && i < stepIndex ? <Check className="h-4 w-4" /> : i + 1}
                    </div>
                    <span className={`text-[9px] font-bold uppercase tracking-wider ${done ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {step}
                    </span>
                  </div>
                  {i < STATUS_STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-1 mb-4 ${stepIndex > i ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Details */}
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Request Details</p>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
              <div>
                <dt className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Facility</dt>
                <dd className="font-semibold text-slate-900">{request.facility_name ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Classification</dt>
                <dd>
                  <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded border ${
                    isEmergency ? 'bg-red-50 text-red-700 border-red-200/60' : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}>
                    {request.classification}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Quantity</dt>
                <dd className="font-bold text-slate-900 text-base">{request.quantity}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Urgency</dt>
                <dd className="font-semibold capitalize text-slate-900">{request.urgency_level}</dd>
              </div>
              {request.timeframe_hours && (
                <div>
                  <dt className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Timeframe</dt>
                  <dd className="font-semibold text-slate-900">{request.timeframe_hours}h</dd>
                </div>
              )}
              {isEmergency && request.broadcast_radius_km && (
                <div>
                  <dt className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Broadcast Radius</dt>
                  <dd className="font-semibold text-slate-900">{request.broadcast_radius_km} km</dd>
                </div>
              )}
              <div>
                <dt className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Price / Unit</dt>
                <dd className="font-semibold text-slate-900">{request.price_per_unit != null ? `₵${request.price_per_unit}` : 'TBD'}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Total Amount</dt>
                <dd className="font-bold text-slate-900">
                  ₵{request.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  <span className={`ml-2 text-[9px] px-1.5 py-0.5 rounded border font-bold uppercase ${
                    request.payment_status === 'paid'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
                      : 'bg-amber-50 text-amber-700 border-amber-200/60'
                  }`}>{request.payment_status}</span>
                </dd>
              </div>
              {request.expires_at && (
                <div className="col-span-2">
                  <dt className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Time Remaining
                  </dt>
                  <dd><TimeRemaining expiresAt={request.expires_at} /></dd>
                </div>
              )}
              {request.additional_notes && (
                <div className="col-span-2">
                  <dt className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Notes</dt>
                  <dd className="text-slate-700 font-medium leading-relaxed">{request.additional_notes}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Acknowledgment / Fulfillment info */}
          {(request.acknowledged_by || request.fulfilled_by) && (
            <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Activity</p>
              <div className="space-y-3">
                {request.acknowledged_by && (
                  <div className="flex items-center gap-3 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-cyan-600 shrink-0" />
                    <span className="text-slate-700">
                      Acknowledged by <strong>{request.acknowledged_by_name ?? request.acknowledged_by}</strong>
                      {request.acknowledged_at && ` on ${new Date(request.acknowledged_at).toLocaleString()}`}
                    </span>
                  </div>
                )}
                {request.fulfilled_by && (
                  <div className="flex items-center gap-3 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span className="text-slate-700">
                      Fulfilled by <strong>{request.fulfilled_by_name ?? request.fulfilled_by}</strong>
                      {request.fulfilled_at && ` on ${new Date(request.fulfilled_at).toLocaleString()}`}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Actions panel */}
        <div className="space-y-4">
          <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Actions</p>

            {actionError && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-xs px-3 py-2 rounded-xl font-medium mb-3">
                {actionError}
              </div>
            )}

            <div className="space-y-2">
              {canAcknowledge && (
                <button
                  onClick={handleAcknowledge}
                  disabled={actionLoading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-bold text-cyan-700 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200/60 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Acknowledge Request
                </button>
              )}
              {canFulfill && (
                <button
                  onClick={() => { setShowFulfill(true); setActionError(null); }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/60 rounded-xl transition-all cursor-pointer"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Fulfill Request
                </button>
              )}
              {canCancel && (
                <button
                  onClick={() => { setShowCancel(true); setActionError(null); }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200/60 rounded-xl transition-all cursor-pointer"
                >
                  <XCircle className="h-4 w-4" />
                  Cancel Request
                </button>
              )}
              {!canAcknowledge && !canFulfill && !canCancel && (
                <p className="text-xs text-slate-400 font-medium text-center py-4">
                  No actions available for this request.
                </p>
              )}
            </div>
          </div>

          {/* Meta */}
          <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Metadata</p>
            <div className="space-y-2 text-xs text-slate-500 font-medium">
              {request.created_by && <p>Created by: <span className="text-slate-700">{request.created_by.email}</span></p>}
              <p>Created: <span className="text-slate-700">{new Date(request.created_at).toLocaleString()}</span></p>
              {request.updated_at && <p>Updated: <span className="text-slate-700">{new Date(request.updated_at).toLocaleString()}</span></p>}
            </div>
          </div>
        </div>
      </div>

      {/* Fulfill Modal */}
      {showFulfill && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Fulfill Request
            </h3>
            <form onSubmit={handleFulfill} className="space-y-4">
              {actionError && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-xs px-3 py-2 rounded-xl font-medium">{actionError}</div>
              )}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Price Per Unit (₵) — optional</label>
                <input type="number" min="0" step="any" placeholder={`Default: ${request.price_per_unit ?? 'from inventory'}`} value={pricePerUnit} onChange={(e) => setPricePerUnit(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 outline-none focus:border-emerald-500 shadow-inner" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Quantity Fulfilled — optional</label>
                <input type="number" min="1" max={request.quantity} placeholder={`Default: ${request.quantity} (full)`} value={quantityFulfilled} onChange={(e) => setQuantityFulfilled(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 outline-none focus:border-emerald-500 shadow-inner" />
              </div>
              {isSuperAdmin && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Responding Facility ID — optional</label>
                  <input type="text" placeholder="UUID of responding facility" value={respondingFacilityId} onChange={(e) => setRespondingFacilityId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 outline-none focus:border-emerald-500 shadow-inner" />
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowFulfill(false)} className="flex-1 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer">Cancel</button>
                <button type="submit" disabled={actionLoading} className="flex-1 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2">
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Confirm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {showCancel && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <h3 className="text-sm font-bold uppercase tracking-widest">Cancel Request</h3>
            </div>
            <p className="text-sm text-slate-600">
              Are you sure? This cannot be undone.
              {!isEmergency && request.total_amount > 0 && (
                <span className="block mt-1 font-semibold text-emerald-700">
                  ₵{request.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} will be refunded to your balance.
                </span>
              )}
            </p>
            {actionError && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-xs px-3 py-2 rounded-xl font-medium">{actionError}</div>
            )}
            <div className="flex gap-3">
              <button onClick={() => setShowCancel(false)} className="flex-1 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer">Keep</button>
              <button onClick={handleCancel} disabled={actionLoading} className="flex-1 py-2.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2">
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />} Cancel It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
