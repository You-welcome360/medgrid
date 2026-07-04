import React, { useState, useEffect, useCallback } from 'react';
import { Bell, CheckCheck, Loader2, Filter } from 'lucide-react';
import { getNotifications, markRead, markAllRead } from '@/services/notificationService';
import { useUnreadCount } from '@/hooks/useUnreadCount';
import type { Notification, NotificationType } from '@/types';

const TYPE_LABELS: Record<NotificationType, string> = {
  REQUEST_CREATED: 'Request Created',
  REQUEST_ACKNOWLEDGED: 'Acknowledged',
  REQUEST_FULFILLED: 'Fulfilled',
  REQUEST_CANCELED: 'Canceled',
  REQUEST_EXPIRED: 'Expired',
  BALANCE_LOW: 'Low Balance',
  BALANCE_TOPUP: 'Balance Top-Up',
};

const TYPE_COLORS: Record<NotificationType, string> = {
  REQUEST_CREATED: 'bg-blue-50 text-blue-700 border-blue-200/60',
  REQUEST_ACKNOWLEDGED: 'bg-cyan-50 text-cyan-700 border-cyan-200/60',
  REQUEST_FULFILLED: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
  REQUEST_CANCELED: 'bg-slate-100 text-slate-600 border-slate-200/60',
  REQUEST_EXPIRED: 'bg-orange-50 text-orange-700 border-orange-200/60',
  BALANCE_LOW: 'bg-red-50 text-red-700 border-red-200/60',
  BALANCE_TOPUP: 'bg-violet-50 text-violet-700 border-violet-200/60',
};

const PAGE_SIZE = 20;

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [readFilter, setReadFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [typeFilter, setTypeFilter] = useState('');
  const [markingAll, setMarkingAll] = useState(false);

  const { reset: resetBadge, decrement } = useUnreadCount();

  const load = useCallback(async () => {
    setFetching(true);
    setError(null);
    try {
      const data = await getNotifications({
        page,
        limit: PAGE_SIZE,
        ...(readFilter === 'unread' && { read: false }),
        ...(readFilter === 'read' && { read: true }),
        ...(typeFilter && { type: typeFilter }),
      });
      setNotifications(data.notifications);
      setTotal(data.pagination.total);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load notifications');
    } finally {
      setFetching(false);
    }
  }, [page, readFilter, typeFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const handleMarkRead = async (n: Notification) => {
    if (n.read_at) return;
    try {
      await markRead(n.id);
      setNotifications((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x))
      );
      decrement();
    } catch {
      // ignore
    }
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
      resetBadge();
    } catch (err: any) {
      setError(err.message ?? 'Failed to mark all read');
    } finally {
      setMarkingAll(false);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const unreadInView = notifications.filter((n) => !n.read_at).length;

  return (
    <div className="space-y-6 text-slate-800">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Bell className="h-5 w-5 text-emerald-600" />
            Notifications
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            System alerts, request updates, and balance events.
          </p>
        </div>
        {unreadInView > 0 && (
          <button
            onClick={handleMarkAllRead}
            disabled={markingAll}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/60 rounded-xl transition-all cursor-pointer"
          >
            {markingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5" />}
            Mark All Read
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Filters</span>
        </div>
        {/* Read status */}
        <div className="flex rounded-xl overflow-hidden border border-slate-200 text-xs font-bold">
          {(['all', 'unread', 'read'] as const).map((f) => (
            <button
              key={f}
              onClick={() => { setReadFilter(f); setPage(1); }}
              className={`px-3 py-1.5 capitalize transition-colors cursor-pointer ${
                readFilter === f
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white text-slate-500 hover:bg-slate-50'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        {/* Type filter */}
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 font-semibold outline-none focus:border-emerald-500 cursor-pointer"
        >
          <option value="">All Types</option>
          {(Object.keys(TYPE_LABELS) as NotificationType[]).map((t) => (
            <option key={t} value={t}>{TYPE_LABELS[t]}</option>
          ))}
        </select>
      </div>

      {/* List */}
      <div className="bg-white border border-slate-200/60 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Inbox</h3>
          <span className="text-xs font-semibold text-slate-500 bg-slate-200/80 px-2 py-0.5 rounded-full">
            {total} total
          </span>
        </div>

        {fetching ? (
          <div className="p-12 flex items-center justify-center gap-2 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading notifications...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-sm bg-red-50 text-red-600 font-medium">{error}</div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-400 font-medium">
            No notifications matching your filters.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {notifications.map((n) => (
              <li
                key={n.id}
                onClick={() => handleMarkRead(n)}
                className={`flex gap-4 px-6 py-4 transition-colors cursor-pointer ${
                  n.read_at ? 'bg-white hover:bg-slate-50/50' : 'bg-blue-50/30 hover:bg-blue-50/50'
                }`}
              >
                {/* Unread dot */}
                <div className="mt-1.5 shrink-0">
                  {n.read_at ? (
                    <span className="h-2 w-2 rounded-full bg-slate-200 block" />
                  ) : (
                    <span className="h-2 w-2 rounded-full bg-blue-500 block" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${
                          TYPE_COLORS[n.type] ?? 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {TYPE_LABELS[n.type] ?? n.type}
                      </span>
                      <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider border border-slate-200 bg-slate-50 px-2 py-0.5 rounded">
                        {n.channel}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap shrink-0">
                      {new Date(n.created_at).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className={`text-sm mt-1 ${n.read_at ? 'font-medium text-slate-700' : 'font-bold text-slate-900'}`}>
                    {n.title}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{n.body}</p>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 disabled:opacity-40 cursor-pointer"
            >
              ← Previous
            </button>
            <span className="text-xs text-slate-500 font-semibold">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 disabled:opacity-40 cursor-pointer"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
