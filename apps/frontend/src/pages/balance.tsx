import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { facilitiesApi } from '@/api/facilities.api';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  Coins, 
  Loader2, 
  Calendar, 
  CreditCard,
  ChevronLeft,
  ChevronRight,
  TrendingUp
} from 'lucide-react';

export default function BalancePage() {
  const [topUpAmount, setTopUpAmount] = useState('');
  const [page, setPage] = useState(1);
  const [filterType, setFilterType] = useState<string>('');

  const { data: balanceData, isLoading: loadingBalance } = useQuery({
    queryKey: ['facilities', 'balance'],
    queryFn: async () => {
      const res = await facilitiesApi.getBalance();
      return res.data;
    },
  });

  const { data: historyData, isLoading: loadingHistory } = useQuery({
    queryKey: ['facilities', 'balance-history', page, filterType],
    queryFn: async () => {
      const res = await facilitiesApi.getBalanceHistory({ 
        page, 
        limit: 10,
        type: filterType || undefined 
      });
      return res.data;
    },
  });

  const topUpMutation = useMutation({
    mutationFn: async (amount: number) => {
      const res = await facilitiesApi.initializeTopUp({
        amount,
        callbackUrl: window.location.origin + '/balance',
      });
      return res.data;
    },
    onSuccess: (data) => {
      if (data?.payment_url) {
        toast.loading('Redirecting to secure payment page...');
        window.location.href = data.payment_url;
      } else {
        toast.error('Payment initialization succeeded, but redirect URL was missing.');
      }
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to initialize top-up');
    },
  });

  const handleTopUp = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(topUpAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    topUpMutation.mutate(amountNum);
  };

  const balance = balanceData?.balance !== undefined ? Number(balanceData.balance) : 0.0;
  const transactions = historyData?.transactions || [];
  const totalCount = historyData?.pagination?.total || 0;
  const totalPages = Math.ceil(totalCount / 10) || 1;

  return (
    <div className="space-y-6 max-w-6xl">
      <PageHeader title="Facility Balance" />

      {/* Grid container */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Balance Card */}
        <Card className="md:col-span-2 relative overflow-hidden bg-gradient-to-br from-indigo-900/60 to-purple-900/40 border-indigo-500/20 backdrop-blur-md">
          <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl -mr-12 -mt-12" />
          <CardHeader className="relative z-10 pb-2">
            <CardTitle className="text-gray-300 font-medium text-sm uppercase tracking-wider flex items-center gap-2">
              <Coins className="h-4 w-4 text-indigo-400" />
              Available Funds
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10 space-y-6">
            <div>
              {loadingBalance ? (
                <div className="h-12 w-48 bg-slate-800/50 animate-pulse rounded my-2" />
              ) : (
                <h1 className="text-5xl font-extrabold tracking-tight text-white flex items-baseline gap-2">
                  <span className="text-indigo-400 text-3xl font-semibold">₵</span>
                  {balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h1>
              )}
              <p className="text-xs text-gray-400 mt-2">
                Funds are automatically debited for request completions and credited for fulfillments.
              </p>
            </div>
            
            <div className="flex gap-4 p-4 rounded-xl bg-slate-900/40 border border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10 text-green-400">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-[10px] text-gray-500 uppercase font-semibold">Automatic Settlement</div>
                  <div className="text-xs text-gray-300 font-medium mt-0.5">Enabled for all coordination operations</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top-up Form Card */}
        <Card className="border-slate-800 bg-slate-900/20 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-purple-400" />
              Fund Account
            </CardTitle>
            <CardDescription className="text-xs">
              Load balance instantly using Paystack.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleTopUp} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs text-gray-400 font-medium">Amount (GHS)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-500 font-semibold text-sm">₵</span>
                  <Input
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={topUpAmount}
                    onChange={(e) => setTopUpAmount(e.target.value)}
                    className="pl-7 bg-slate-950/50 border-slate-800 text-white focus-visible:ring-indigo-500"
                  />
                </div>
              </div>
              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium"
                disabled={topUpMutation.isPending}
              >
                {topUpMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Initializing...
                  </>
                ) : (
                  'Top Up Now'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Transaction History Card */}
      <Card className="border-slate-800 bg-slate-900/10">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-lg">Ledger & Transaction History</CardTitle>
            <CardDescription className="text-xs">Audit log of all financial activities.</CardDescription>
          </div>
          <div className="flex gap-2">
            <select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value);
                setPage(1);
              }}
              className="bg-slate-950/60 border border-slate-800 text-xs rounded-lg px-2 py-1 text-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">All Types</option>
              <option value="credit">Credit Only</option>
              <option value="debit">Debit Only</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {loadingHistory ? (
            <div className="space-y-3 py-6">
              <div className="h-10 bg-slate-800/50 animate-pulse rounded" />
              <div className="h-10 bg-slate-800/50 animate-pulse rounded" />
              <div className="h-10 bg-slate-800/50 animate-pulse rounded" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12 text-gray-500 text-sm">
              <Coins className="h-12 w-12 text-slate-700 mx-auto mb-3" />
              No transactions found.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-300">
                  <thead className="text-xs text-gray-400 uppercase bg-slate-950/40">
                    <tr>
                      <th className="px-4 py-3">Reference / Desc</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Payment Method</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {transactions.map((tx: any) => {
                      const isCredit = tx.type === 'credit';
                      return (
                        <tr key={tx.id} className="hover:bg-slate-900/30">
                          <td className="px-4 py-3.5">
                            <div className="font-medium text-white flex items-center gap-2">
                              {isCredit ? (
                                <ArrowDownLeft className="h-3.5 w-3.5 text-green-400 shrink-0" />
                              ) : (
                                <ArrowUpRight className="h-3.5 w-3.5 text-red-400 shrink-0" />
                              )}
                              <span>{tx.description}</span>
                            </div>
                            <div className="text-[10px] text-gray-500 font-mono mt-0.5">{tx.reference}</div>
                          </td>
                          <td className="px-4 py-3.5 text-xs text-gray-400">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-3 w-3 text-slate-500" />
                              {new Date(tx.createdAt).toLocaleDateString(undefined, { 
                                year: 'numeric', 
                                month: 'short', 
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-xs">
                            <span className="capitalize px-2 py-0.5 rounded bg-slate-950/60 border border-slate-800 text-gray-400">
                              {tx.paymentMethod}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right font-semibold">
                            <span className={isCredit ? 'text-green-400' : 'text-red-400'}>
                              {isCredit ? '+' : '-'} ₵{Math.abs(Number(tx.amount)).toFixed(2)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-slate-800 pt-4">
                  <div className="text-xs text-gray-500">
                    Showing page {page} of {totalPages} ({totalCount} total records)
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 border-slate-800 text-gray-400 hover:text-white"
                      disabled={page === 1}
                      onClick={() => setPage(p => p - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 border-slate-800 text-gray-400 hover:text-white"
                      disabled={page === totalPages}
                      onClick={() => setPage(p => p + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
