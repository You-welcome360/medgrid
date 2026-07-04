import React, { useState, useEffect, useCallback } from 'react';
import { Wallet, TrendingUp, TrendingDown, Loader2, RefreshCw, ExternalLink } from 'lucide-react';
import { getBalance, initializeTopUp, getBalanceHistory } from '@/services/facilityService';
import { useSocketEvent } from '@/hooks/useSocket';
import type { FacilityBalance, BalanceTransaction } from '@/types';

const PAGE_SIZE = 20;

export default function BalancePage() {
  const [balance, setBalance] = useState<FacilityBalance | null>(null);
  const [transactions, setTransactions] = useState<BalanceTransaction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [fetching, setFetching] = useState(true);
  const [txFetching, setTxFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Top-up modal state
  const [showTopUp, setShowTopUp] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [topUpLoading, setTopUpLoading] = useState(false);
  const [topUpError, setTopUpError] = useState<string | null>(null);

  // Filters
  const [typeFilter, setTypeFilter] = useState('');

  const loadBalance = useCallback(async () => {
    try {
      const data = await getBalance();
      setBalance(data);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load balance');
    }
  }, []);

  const loadHistory = useCallback(async () => {
    setTxFetching(true);
    try {
      const data = await getBalanceHistory({
        page,
        limit: PAGE_SIZE,
        ...(typeFilter && { type: typeFilter }),
      });
      setTransactions(data.transactions);
      setTotal(data.pagination.total);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load history');
    } finally {
      setTxFetching(false);
    }
  }, [page, typeFilter]);

  useEffect(() => {
    setFetching(true);
    Promise.all([loadBalance(), loadHistory()]).finally(() => setFetching(false));
  }, [loadBalance, loadHistory]);

  // Real-time balance updates via socket
  useSocketEvent<{ amount: number; new_balance: number }>('balance:topup', (data) => {
    setBalance((prev) => prev ? { ...prev, balance: data.new_balance } : prev);
    loadHistory();
  });

  useSocketEvent<{ current_balance: number }>('balance:low', (data) => {
    setBalance((prev) => prev ? { ...prev, balance: data.current_balance } : prev);
  });

  const handleTopUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(topUpAmount);
    if (!amount || amount <= 0) {
      setTopUpError('Enter a valid amount');
      return;
    }
    setTopUpLoading(true);
    setTopUpError(null);
    try {
      const data = await initializeTopUp(amount, window.location.href);
      // Open Paystack checkout in new tab
      window.open(data.payment_url, '_blank');
      setShowTopUp(false);
      setTopUpAmount('');
    } catch (err: any) {
      setTopUpError(err.message ?? 'Failed to initialize payment');
    } finally {
      setTopUpLoading(false);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const isLowBalance = balance && balance.balance < 100;

  if (fetching) {
    return (
      <div className="p-12 flex items-center justify-center gap-2 text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading balance data...
      </div>
    );
  }

  return (
    <div className="space-y-6 text-slate-800">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Wallet className="h-5 w-5 text-emerald-600" />
          Facility Balance
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Manage your facility's funds and view transaction history.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl font-medium">
          {error}
        </div>
      )}

      {/* Low balance warning */}
      {isLowBalance && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 text-sm px-4 py-3 rounded-xl font-medium flex items-center gap-2">
          ⚠️ Your balance is below the minimum threshold (₵100). Top up to continue making coordination requests.
        </div>
      )}

      {/* Balance card */}
      {balance && (
        <div className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
              Current Balance — {balance.facility_name}
            </p>
            <p className={`text-4xl font-black tracking-tight ${isLowBalance ? 'text-red-600' : 'text-slate-900'}`}>
              ₵{balance.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadBalance}
              className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500 transition-all cursor-pointer"
              title="Refresh balance"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <button
              onClick={() => setShowTopUp(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-all shadow-sm cursor-pointer"
            >
              <ExternalLink className="h-4 w-4" />
              Top Up
            </button>
          </div>
        </div>
      )}

      {/* Transaction History */}
      <div className="bg-white border border-slate-200/60 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Transaction History</h3>
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="">All Types</option>
            <option value="topup">Top-Ups</option>
            <option value="deduction">Deductions</option>
          </select>
        </div>

        {txFetching ? (
          <div className="p-8 flex items-center justify-center gap-2 text-slate-400 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading transactions...
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-400 font-medium">No transactions found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50/30 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200/80">
                  <th className="px-6 py-3.5">Date</th>
                  <th className="px-6 py-3.5">Type</th>
                  <th className="px-6 py-3.5">Description</th>
                  <th className="px-6 py-3.5">Method</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/40 transition-colors">
                    <td className="px-6 py-4 text-xs text-slate-500 font-medium whitespace-nowrap">
                      {new Date(tx.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${
                        tx.type === 'topup'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
                          : 'bg-red-50 text-red-700 border-red-200/60'
                      }`}>
                        {tx.type === 'topup'
                          ? <TrendingUp className="h-2.5 w-2.5" />
                          : <TrendingDown className="h-2.5 w-2.5" />}
                        {tx.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600 font-medium max-w-xs truncate">
                      {tx.description ?? '—'}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500 font-semibold uppercase">
                      {tx.payment_method}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${
                        tx.status === 'completed'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
                          : tx.status === 'pending'
                          ? 'bg-amber-50 text-amber-700 border-amber-200/60'
                          : 'bg-red-50 text-red-700 border-red-200/60'
                      }`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className={`px-6 py-4 text-right font-bold text-sm ${
                      tx.type === 'topup' ? 'text-emerald-600' : 'text-red-600'
                    }`}>
                      {tx.type === 'topup' ? '+' : '-'}₵{Math.abs(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 disabled:opacity-40 cursor-pointer"
            >
              ← Previous
            </button>
            <span className="text-xs text-slate-500 font-semibold">Page {page} of {totalPages}</span>
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

      {/* Top-Up Modal */}
      {showTopUp && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Top Up Balance</h3>
            <p className="text-xs text-slate-500">
              Enter an amount and you'll be redirected to Paystack to complete payment securely.
            </p>
            <form onSubmit={handleTopUp} className="space-y-4">
              {topUpError && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-xs px-3 py-2 rounded-xl font-medium">
                  {topUpError}
                </div>
              )}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Amount (₵)
                </label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  placeholder="e.g. 500"
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-emerald-500 focus:bg-white transition-all shadow-inner"
                  autoFocus
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowTopUp(false); setTopUpError(null); setTopUpAmount(''); }}
                  className="flex-1 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={topUpLoading}
                  className="flex-1 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {topUpLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                  Pay Now
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
