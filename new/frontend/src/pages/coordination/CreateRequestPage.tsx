import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Loader2, Zap, ArrowLeftRight, AlertCircle } from 'lucide-react';
import { getResourceTypes, createRequest } from '@/services/coordinationService';
import { getBalance } from '@/services/facilityService';
import type { ResourceType, CreateRequestPayload, UrgencyLevel, Classification } from '@/types';

export default function CreateRequestPage() {
  const navigate = useNavigate();

  const [resourceTypes, setResourceTypes] = useState<ResourceType[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [loadingMeta, setLoadingMeta] = useState(true);

  // Form state
  const [classification, setClassification] = useState<Classification>('normal');
  const [resourceTypeId, setResourceTypeId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [urgencyLevel, setUrgencyLevel] = useState<UrgencyLevel>('medium');
  const [timeframeHours, setTimeframeHours] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [broadcastRadius, setBroadcastRadius] = useState('25');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSuperAdmin = (() => {
    try { return JSON.parse(localStorage.getItem('medgrid_user') || '{}')?.role === 'SUPER_ADMIN'; } catch { return false; }
  })();

  useEffect(() => {
    Promise.all([
      getResourceTypes().then((d) => setResourceTypes(d.resource_types)),
      !isSuperAdmin ? getBalance().then((d) => setBalance(d.balance)) : Promise.resolve(),
    ]).finally(() => setLoadingMeta(false));
  }, [isSuperAdmin]);

  const selectedResource = resourceTypes.find((r) => r.id === resourceTypeId);
  const estimatedCost =
    selectedResource && quantity ? selectedResource.default_price * parseInt(quantity || '0', 10) : null;
  const canAfford = balance === null || estimatedCost === null || classification === 'emergency' || balance >= estimatedCost;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resourceTypeId) { setError('Please select a resource type'); return; }
    if (!quantity || parseInt(quantity) <= 0) { setError('Quantity must be greater than 0'); return; }
    if (classification === 'emergency' && !['critical', 'high'].includes(urgencyLevel)) {
      setError('Emergency requests require Critical or High urgency');
      return;
    }

    setLoading(true);
    setError(null);

    const payload: CreateRequestPayload = {
      resource_type_id: resourceTypeId,
      quantity: parseInt(quantity, 10),
      urgency_level: urgencyLevel,
      classification,
      ...(timeframeHours && { timeframe_hours: parseInt(timeframeHours, 10) }),
      ...(additionalNotes && { additional_notes: additionalNotes }),
      ...(classification === 'emergency' && { broadcast_radius_km: parseInt(broadcastRadius, 10) }),
    };

    try {
      const created = await createRequest(payload);
      navigate(`/coordination/requests/${created.id}`);
    } catch (err: any) {
      setError(err.message ?? 'Failed to create request');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6 text-slate-800">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/coordination/requests')}
          className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 transition-all shadow-sm cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Plus className="h-5 w-5 text-emerald-600" />
            New Coordination Request
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Request a resource from the network. Normal requests are paid upfront; emergency requests are deferred.
          </p>
        </div>
      </div>

      {/* Classification toggle */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Request Type</p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => { setClassification('normal'); setUrgencyLevel('medium'); }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-bold transition-all cursor-pointer ${
              classification === 'normal'
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
            }`}
          >
            <ArrowLeftRight className="h-4 w-4" />
            Normal Request
          </button>
          <button
            type="button"
            onClick={() => { setClassification('emergency'); setUrgencyLevel('critical'); }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-bold transition-all cursor-pointer ${
              classification === 'emergency'
                ? 'bg-red-600 text-white border-red-600'
                : 'bg-white text-slate-500 border-slate-200 hover:border-red-300'
            }`}
          >
            <Zap className="h-4 w-4" />
            Emergency
          </button>
        </div>
        {classification === 'emergency' && (
          <div className="mt-3 flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200/60 px-3 py-2.5 rounded-xl font-medium">
            <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            Emergency requests expire in 4 hours. Payment is deducted after fulfillment. No balance required upfront.
          </div>
        )}
      </div>

      {/* Form */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
        {loadingMeta ? (
          <div className="flex items-center justify-center gap-2 py-8 text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading resource catalog...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-xs px-4 py-3 rounded-xl font-medium">
                {error}
              </div>
            )}

            {/* Resource Type */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Resource Type *
              </label>
              {resourceTypes.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No resource types found. Ask an admin to seed the catalog.</p>
              ) : (
                <select
                  value={resourceTypeId}
                  onChange={(e) => setResourceTypeId(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 outline-none focus:border-emerald-500 focus:bg-white shadow-inner"
                >
                  <option value="">— Select a resource —</option>
                  {resourceTypes.map((rt) => (
                    <option key={rt.id} value={rt.id}>
                      {rt.name} {rt.default_price > 0 ? `(₵${rt.default_price}/unit)` : '(Free)'}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Quantity + Urgency */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Quantity *
                </label>
                <input
                  type="number"
                  min="1"
                  placeholder="e.g. 5"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-emerald-500 focus:bg-white shadow-inner"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Urgency Level *
                </label>
                <select
                  value={urgencyLevel}
                  onChange={(e) => setUrgencyLevel(e.target.value as UrgencyLevel)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 outline-none focus:border-emerald-500 focus:bg-white shadow-inner"
                >
                  {classification === 'emergency' ? (
                    <>
                      <option value="critical">Critical</option>
                      <option value="high">High</option>
                    </>
                  ) : (
                    <>
                      <option value="critical">Critical</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            {/* Emergency fields */}
            {classification === 'emergency' && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Broadcast Radius (km) *
                </label>
                <select
                  value={broadcastRadius}
                  onChange={(e) => setBroadcastRadius(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 outline-none focus:border-emerald-500 focus:bg-white shadow-inner"
                >
                  <option value="10">10 km</option>
                  <option value="25">25 km</option>
                  <option value="50">50 km</option>
                  <option value="100">100 km</option>
                </select>
                <p className="text-[10px] text-slate-400 mt-1.5 font-medium">
                  Only facilities within this radius will see your emergency on the board.
                </p>
              </div>
            )}

            {/* Timeframe */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Timeframe (hours) — optional
              </label>
              <input
                type="number"
                min="1"
                placeholder={classification === 'emergency' ? 'Default: 2 hours' : 'Default: 48 hours'}
                value={timeframeHours}
                onChange={(e) => setTimeframeHours(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-emerald-500 focus:bg-white shadow-inner"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Additional Notes — optional
              </label>
              <textarea
                rows={3}
                placeholder="Any specific requirements or context..."
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-emerald-500 focus:bg-white shadow-inner resize-none"
              />
            </div>

            {/* Cost preview */}
            {estimatedCost !== null && classification === 'normal' && (
              <div className={`border rounded-xl px-4 py-3 text-sm font-semibold ${
                canAfford
                  ? 'bg-emerald-50 border-emerald-200/60 text-emerald-700'
                  : 'bg-red-50 border-red-200/60 text-red-700'
              }`}>
                <div className="flex justify-between items-center">
                  <span>Estimated Cost</span>
                  <span className="font-black">₵{estimatedCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                {balance !== null && (
                  <div className="flex justify-between items-center mt-1 text-xs opacity-80">
                    <span>Current Balance</span>
                    <span>₵{balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                {!canAfford && (
                  <p className="text-xs mt-2 font-bold">
                    Insufficient balance. Please top up before submitting.
                  </p>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || (!canAfford && classification === 'normal')}
              className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Submitting Request...</>
              ) : (
                `Submit ${classification === 'emergency' ? 'Emergency ' : ''}Request`
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
