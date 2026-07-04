import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeftRight, Plus, Loader2, Filter, Search } from 'lucide-react';
import { getRequests } from '@/services/coordinationService';
import { useSocketEvent } from '@/hooks/useSocket';
import type { CoordinationRequest, RequestStatus, UrgencyLevel } from '@/types';

const STATUS_COLORS: Record<RequestStatus, string> = {
  open: 'bg-blue-50 text-blue-700 border-blue-200/60',
  acknowledged: 'bg-cyan-50 text-cyan-700 border-cyan-200/60',
  in_progress: 'bg-amber-50 text-amber-700 border-amber-200/60',
  fulfilled: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
  canceled: 'bg-slate-100 text-slate-500 border-slate-200',
  expired: 'bg-orange-50 text-orange-700 border-orange-200/60',
};

const URGENCY_COLORS: Record<UrgencyLevel, string> = {
  critical: 'bg-red-50 text-red-700 border-red-200/60',
  high: 'bg-orange-50 text-orange-700 border-orange-200/60',
  medium: 'bg-amber-50 text-amber-700 border-amber-200/60',
  low: 'bg-slate-100 text-slate-500 border-slate-200',
};

const PAGE_SIZE = 20;

export default function RequestsPage() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<CoordinationRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setFetching(true);
    setError(null);
    try {
      const data = await getRequests({
        page,
        limit: PAGE_SIZE,
        ...(statusFilter && { status: statusFilter }),
        ...(classFilter && { classification: classFilter }),
        ...(urgencyFilter && { urgency_level: urgencyFilter }),
      });
      setRequests(data.requests);
      setTotal(data.pagination.total);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load requests');
    } finally {
      setFetching(false);
    }
  }, [page, statusFilter, classFilter, urgencyFilter]);

  useEffect(() => { load(); }, [load]);

  // Live updates — prepend new requests to the list
  useSocketEvent('request:created', () => load());
  useSocketEvent('request:acknowledged', () => load());
  useSocketEvent('request:fulfilled', () => load());
  useSocketEvent('request:canceled', () => load());

  const filtered = search.trim()
    ? requests.filter((r) =>
        r.resource_name.toLowerCase().includes(search.toLowerCase())
      )
    : requests;

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6 text-slate-800">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5 text-emerald-600" />
            Coordination Requests
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Manage resource requests, track fulfillment, and coordinate with other facilities.
          </p>
        </div>
        <button
          onClick={() => navigate('/coordination/requests/new')}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-all shadow-sm cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          New Request
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm">
        <Filter className="h-4 w-4 text-slate-400 mt-2" />
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by resource name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs font-medium text-slate-700 placeholder-slate-400 outline-none focus:border-emerald-500"
          />
        </div>
        <select
          value={classFilter}
          onChange={(e) => { setClassFilter(e.target.value); setPage(1); }}
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-500 cursor-pointer"
        >
          <option value="">All Classifications</option>
          <option value="normal">Normal</option>
          <option value="emergency">Emergency</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-500 cursor-pointer"
        >
          <option value="">All Statuses</option>
          {(['open', 'acknowledged', 'in_progress', 'fulfilled', 'canceled', 'expired'] as RequestStatus[]).map((s) => (
            <option key={s} value={s}>{s.replace('_', ' ')}</option>
          ))}
        </select>
        <select
          value={urgencyFilter}
          onChange={(e) => { setUrgencyFilter(e.target.value); setPage(1); }}
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-500 cursor-pointer"
        >
          <option value="">All Urgencies</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200/60 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Requests</h3>
          <span className="text-xs font-semibold text-slate-500 bg-slate-200/80 px-2 py-0.5 rounded-full">
            {total} total
          </span>
        </div>

        {fetching ? (
          <div className="p-12 flex items-center justify-center gap-2 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading requests...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-sm bg-red-50 text-red-600 font-medium rounded-b-2xl">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-400 font-medium">
            No requests found. Create your first request using the button above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50/30 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200/80">
                  <th className="px-6 py-3.5">Resource</th>
                  <th className="px-6 py-3.5">Qty</th>
                  <th className="px-6 py-3.5">Classification</th>
                  <th className="px-6 py-3.5">Urgency</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Amount</th>
                  <th className="px-6 py-3.5">Expires</th>
                  <th className="px-6 py-3.5">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((req) => (
                  <tr
                    key={req.id}
                    onClick={() => navigate(`/coordination/requests/${req.id}`)}
                    className="hover:bg-slate-50/60 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4 font-semibold text-slate-900">{req.resource_name}</td>
                    <td className="px-6 py-4 font-mono text-sm text-slate-700">{req.quantity}</td>
                    <td className="px-6 py-4">
                      <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${
                        req.classification === 'emergency'
                          ? 'bg-red-50 text-red-700 border-red-200/60'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {req.classification}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${URGENCY_COLORS[req.urgency_level]}`}>
                        {req.urgency_level}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${STATUS_COLORS[req.status]}`}>
                        {req.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-700">
                      ₵{req.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500 font-medium">
                      {req.expires_at ? new Date(req.expires_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500 font-medium">
                      {new Date(req.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="text-xs font-bold text-slate-500 hover:text-slate-800 disabled:opacity-40 cursor-pointer">← Previous</button>
            <span className="text-xs text-slate-500 font-semibold">Page {page} of {totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="text-xs font-bold text-slate-500 hover:text-slate-800 disabled:opacity-40 cursor-pointer">Next →</button>
          </div>
        )}
      </div>
    </div>
  );
}
