import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  Search,
  RotateCcw,
  Download,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Info,
  ShieldAlert,
  Activity,
  Calendar,
} from 'lucide-react';
import { toast } from 'sonner';

import { auditApi } from '@/api/audit.api';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import type { AuditLog } from '@/types';

// ============================================================
// Constants & helpers
// ============================================================

const CATEGORY_MAP: Record<string, string[]> = {
  AUTH: ['LOGIN', 'LOGOUT', 'LOGIN_FAILED', 'PASSWORD_CHANGED', 'ACCOUNT_LOCKED'],
  ONBOARDING: ['ONBOARDING_REQUEST_SUBMITTED', 'ONBOARDING_REQUEST_APPROVED', 'ONBOARDING_REQUEST_REJECTED'],
  FACILITY: ['FACILITY_CREATED', 'FACILITY_UPDATED', 'FACILITY_SUSPENDED'],
  USER: ['USER_CREATED', 'USER_SUSPENDED', 'USER_DEACTIVATED', 'USER_ROLE_CHANGED'],
  INVENTORY: ['INVENTORY_CREATED', 'INVENTORY_UPDATED', 'INVENTORY_ADJUSTED', 'INVENTORY_DELETED'],
  REQUEST: ['REQUEST_CREATED', 'REQUEST_ACCEPTED', 'REQUEST_REJECTED', 'REQUEST_COMPLETED', 'REQUEST_CANCELLED', 'REQUEST_DISPATCHED', 'REQUEST_FAILED'],
};

const HIGH_SEVERITY = ['LOGIN_FAILED', 'ACCOUNT_LOCKED', 'USER_SUSPENDED', 'REQUEST_FAILED'];

const getCategory = (action: string): string => {
  for (const [cat, actions] of Object.entries(CATEGORY_MAP)) {
    if (actions.includes(action)) return cat;
  }
  return 'OTHER';
};

const formatAction = (action: string): string =>
  action.split('_').map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');

const CATEGORY_CONFIG: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  AUTH: { bg: 'bg-indigo-500/15', text: 'text-indigo-300', dot: 'bg-indigo-400', label: 'Auth' },
  ONBOARDING: { bg: 'bg-emerald-500/15', text: 'text-emerald-300', dot: 'bg-emerald-400', label: 'Onboarding' },
  FACILITY: { bg: 'bg-purple-500/15', text: 'text-purple-300', dot: 'bg-purple-400', label: 'Facility' },
  USER: { bg: 'bg-amber-500/15', text: 'text-amber-300', dot: 'bg-amber-400', label: 'User' },
  INVENTORY: { bg: 'bg-cyan-500/15', text: 'text-cyan-300', dot: 'bg-cyan-400', label: 'Inventory' },
  REQUEST: { bg: 'bg-rose-500/15', text: 'text-rose-300', dot: 'bg-rose-400', label: 'Request' },
  OTHER: { bg: 'bg-gray-500/15', text: 'text-gray-300', dot: 'bg-gray-400', label: 'Other' },
};

// ============================================================
// Subcomponents
// ============================================================

function CategoryBadge({ action }: { action: string }) {
  const cat = getCategory(action);
  const cfg = CATEGORY_CONFIG[cat] ?? CATEGORY_CONFIG['OTHER'];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide ${cfg.bg} ${cfg.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function JsonDiffViewer({ previous, current }: { previous: any; current: any }) {
  const hasPrev = previous != null && typeof previous === 'object' && Object.keys(previous).length > 0;
  const hasCurr = current != null && typeof current === 'object' && Object.keys(current).length > 0;

  if (!hasPrev && !hasCurr) {
    return (
      <p className="text-xs text-slate-500 italic py-2">No snapshot data recorded for this event.</p>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div className="rounded-lg bg-slate-950 border border-rose-500/20 overflow-hidden">
        <div className="px-3 py-2 border-b border-rose-500/20 bg-rose-500/10">
          <span className="text-[10px] font-bold uppercase tracking-widest text-rose-400">Before</span>
        </div>
        <pre className="p-3 text-xs text-rose-300/80 whitespace-pre-wrap font-mono overflow-x-auto">
          {hasPrev ? JSON.stringify(previous, null, 2) : <span className="text-slate-600 italic">— empty —</span>}
        </pre>
      </div>
      <div className="rounded-lg bg-slate-950 border border-emerald-500/20 overflow-hidden">
        <div className="px-3 py-2 border-b border-emerald-500/20 bg-emerald-500/10">
          <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">After</span>
        </div>
        <pre className="p-3 text-xs text-emerald-300/80 whitespace-pre-wrap font-mono overflow-x-auto">
          {hasCurr ? JSON.stringify(current, null, 2) : <span className="text-slate-600 italic">— empty —</span>}
        </pre>
      </div>
    </div>
  );
}

function LogRow({ log, isExpanded, onToggle }: { log: AuditLog; isExpanded: boolean; onToggle: () => void }) {
  // const category = getCategory(log.action);
  const isSuspicious = HIGH_SEVERITY.includes(log.action);

  return (
    <>
      {/* Main row */}
      <div
        onClick={onToggle}
        className={`group grid cursor-pointer transition-all duration-150 ${isSuspicious
            ? 'border-l-2 border-l-red-500 bg-red-500/5 hover:bg-red-500/10'
            : 'border-l-2 border-l-transparent hover:bg-white/[0.03]'
          } ${isExpanded ? 'bg-white/[0.04]' : ''}`}
        style={{ gridTemplateColumns: '1fr 1fr 1.4fr 0.7fr 0.9fr' }}
      >
        {/* Action */}
        <div className="flex items-start gap-2.5 px-4 py-3.5">
          <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center text-slate-500 group-hover:text-slate-300 transition-colors">
            {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </div>
          <div className="min-w-0 space-y-1">
            <CategoryBadge action={log.action} />
            <p className={`text-sm font-semibold leading-tight ${isSuspicious ? 'text-red-300' : 'text-slate-100'}`}>
              {formatAction(log.action)}
            </p>
            {isSuspicious && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-400 uppercase tracking-wider">
                <ShieldAlert className="h-2.5 w-2.5" />
                Flagged
              </span>
            )}
          </div>
        </div>

        {/* Actor */}
        <div className="flex flex-col justify-center gap-0.5 px-4 py-3.5 border-l border-white/5">
          {log.actorId ? (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="cursor-default font-mono text-sm text-slate-200 hover:text-white transition-colors w-fit">
                    {log.actorId.slice(0, 8)}<span className="text-slate-500">…</span>
                  </span>
                </TooltipTrigger>
                <TooltipContent className="font-mono text-xs bg-slate-900 border-white/10">
                  {log.actorId}
                </TooltipContent>
              </Tooltip>
              <span className={`inline-block text-[10px] font-bold uppercase tracking-widest w-fit px-1.5 py-0.5 rounded ${log.actorRole === 'SUPER_ADMIN'
                  ? 'bg-violet-500/20 text-violet-300'
                  : log.actorRole === 'FACILITY_ADMIN'
                    ? 'bg-sky-500/20 text-sky-300'
                    : 'bg-slate-500/20 text-slate-400'
                }`}>
                {log.actorRole?.replace(/_/g, ' ') ?? 'Unknown'}
              </span>
            </>
          ) : (
            <>
              <span className="text-sm text-slate-500 italic">System</span>
              <span className="text-[10px] text-slate-600 uppercase tracking-wider">Automated</span>
            </>
          )}
        </div>

        {/* Target Entity */}
        <div className="flex flex-col justify-center gap-0.5 px-4 py-3.5 border-l border-white/5">
          <span className="text-sm font-semibold text-slate-200">{log.entityType}</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-default font-mono text-xs text-slate-400 hover:text-slate-200 transition-colors truncate max-w-[240px]">
                {log.entityId}
              </span>
            </TooltipTrigger>
            <TooltipContent className="font-mono text-xs bg-slate-900 border-white/10 max-w-xs break-all">
              {log.entityId}
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Context */}
        <div className="flex flex-col justify-center gap-1 px-4 py-3.5 border-l border-white/5">
          {log.facilityId ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-default font-mono text-xs text-slate-400 hover:text-slate-200 transition-colors">
                  {log.facilityId.slice(0, 8)}<span className="text-slate-600">…</span>
                </span>
              </TooltipTrigger>
              <TooltipContent className="font-mono text-xs bg-slate-900 border-white/10 max-w-xs break-all">
                Facility: {log.facilityId}
              </TooltipContent>
            </Tooltip>
          ) : (
            <span className="text-xs text-slate-600 italic">Global</span>
          )}
          {(log.ipAddress || log.userAgent) && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={(e) => e.stopPropagation()}
                  className="flex w-fit items-center gap-1 text-xs text-slate-500 hover:text-slate-200 transition-colors"
                >
                  <Info className="h-3 w-3" />
                  <span>Session</span>
                </button>
              </TooltipTrigger>
              <TooltipContent className="text-xs bg-slate-900 border-white/10 p-3 space-y-2 max-w-[300px]">
                {log.ipAddress && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">IP Address</p>
                    <p className="font-mono text-slate-200">{log.ipAddress}</p>
                  </div>
                )}
                {log.userAgent && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">User Agent</p>
                    <p className="text-slate-300 break-words leading-snug">{log.userAgent}</p>
                  </div>
                )}
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Timestamp */}
        <div className="flex flex-col items-end justify-center px-4 py-3.5 border-l border-white/5">
          <span className="text-sm font-medium text-slate-200">
            {format(new Date(log.createdAt), 'MMM d, yyyy')}
          </span>
          <span className="text-xs text-slate-500 tabular-nums">
            {format(new Date(log.createdAt), 'h:mm:ss a')}
          </span>
        </div>
      </div>

      {/* Expanded diff */}
      {isExpanded && (
        <div className="border-l-2 border-l-white/20 bg-slate-900/30 px-6 py-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Change Snapshot</span>
          </div>
          <JsonDiffViewer previous={log.previousValue} current={log.newValue} />
        </div>
      )}

      {/* Row separator */}
      <div className="h-px bg-white/5 mx-2" />
    </>
  );
}

// ============================================================
// Main page
// ============================================================

export default function AdminAuditLogsPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('ALL');
  const [actorRole, setActorRole] = useState('ALL');
  const [facilityId, setFacilityId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const limit = 25;

  const [searchInput, setSearchInput] = useState('');
  const [facilityInput, setFacilityInput] = useState('');

  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const toggleRow = (id: string) => setExpandedRows((p) => ({ ...p, [id]: !p[id] }));

  const queryParams = {
    page,
    limit,
    search: search || undefined,
    category: category !== 'ALL' ? category : undefined,
    actorRole: actorRole !== 'ALL' ? actorRole : undefined,
    facilityId: facilityId || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: ['audit-logs', queryParams],
    queryFn: () => auditApi.list(queryParams),
  });

  const logs = data?.data?.items ?? [];
  const totalPages = data?.data?.totalPages ?? 1;
  const totalLogs = data?.data?.total ?? 0;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setFacilityId(facilityInput);
    setPage(1);
  };

  const handleReset = () => {
    setSearch(''); setSearchInput('');
    setCategory('ALL'); setActorRole('ALL');
    setFacilityId(''); setFacilityInput('');
    setDateFrom(''); setDateTo('');
    setPage(1);
  };

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const exportRes = await auditApi.list({ ...queryParams, page: 1, limit: 500 });
      const exportLogs = exportRes.data?.items ?? [];

      if (exportLogs.length === 0) {
        toast.error('No logs available to export');
        return;
      }

      const cols = ['ID', 'Timestamp', 'Action', 'Category', 'Actor ID', 'Actor Role', 'Entity Type', 'Entity ID', 'Facility ID', 'IP Address', 'User Agent', 'Previous Value', 'New Value'];
      const rows = exportLogs.map((log: AuditLog) => [
        log.id, log.createdAt, log.action, getCategory(log.action),
        log.actorId ?? '', log.actorRole ?? '',
        log.entityType, log.entityId, log.facilityId ?? '',
        log.ipAddress ?? '', log.userAgent ?? '',
        log.previousValue ? JSON.stringify(log.previousValue) : '',
        log.newValue ? JSON.stringify(log.newValue) : '',
      ]);

      const csv = [
        cols.join(','),
        ...rows.map((r: any[]) => r.map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(',')),
      ].join('\r\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `medgrid_audit_logs_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Exported ${exportLogs.length} log entries`);
    } catch (err: any) {
      toast.error(`Export failed: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const hasFilters = search || category !== 'ALL' || actorRole !== 'ALL' || facilityId || dateFrom || dateTo;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-6">

        {/* Page header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <PageHeader
            title="Audit Logs"
            description="Track and investigate system changes, logins, and administrative actions across all facilities."
          />
          <Button
            onClick={handleExportCSV}
            disabled={isExporting || isLoading}
            variant="outline"
            className="shrink-0 flex items-center gap-2 border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 hover:text-white disabled:opacity-50"
          >
            <Download className={`h-4 w-4 ${isExporting ? 'animate-bounce' : ''}`} />
            {isExporting ? 'Exporting…' : 'Export CSV'}
          </Button>
        </div>

        {/* Filters card */}
        <form
          onSubmit={handleSearch}
          className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-4"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {/* Search */}
            <div className="xl:col-span-2 space-y-1.5">
              <Label className="text-xs font-medium text-slate-400">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                <Input
                  placeholder="Actor ID, entity, IP address…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-9 bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500 text-sm h-9 focus-visible:ring-1 focus-visible:ring-slate-500 focus-visible:ring-offset-0"
                />
              </div>
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-400">Category</Label>
              <Select value={category} onValueChange={(v) => { setCategory(v); setPage(1); }}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100 text-sm h-9 focus:ring-1 focus:ring-slate-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700">
                  <SelectItem value="ALL" className="text-slate-200">All Categories</SelectItem>
                  {Object.entries(CATEGORY_CONFIG).filter(([k]) => k !== 'OTHER').map(([key, cfg]) => (
                    <SelectItem key={key} value={key} className="text-slate-200">
                      <span className="flex items-center gap-2">
                        <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                        {cfg.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Role */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-400">Actor Role</Label>
              <Select value={actorRole} onValueChange={(v) => { setActorRole(v); setPage(1); }}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100 text-sm h-9 focus:ring-1 focus:ring-slate-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700">
                  <SelectItem value="ALL" className="text-slate-200">All Roles</SelectItem>
                  <SelectItem value="SUPER_ADMIN" className="text-slate-200">Super Admin</SelectItem>
                  <SelectItem value="FACILITY_ADMIN" className="text-slate-200">Facility Admin</SelectItem>
                  <SelectItem value="COORDINATION_MANAGER" className="text-slate-200">Coordination Manager</SelectItem>
                  <SelectItem value="INVENTORY_MANAGER" className="text-slate-200">Inventory Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date From */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-400">From</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                className="bg-slate-800 border-slate-700 text-slate-100 text-sm h-9 [color-scheme:dark] focus-visible:ring-1 focus-visible:ring-slate-500 focus-visible:ring-offset-0"
              />
            </div>

            {/* Date To */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-400">To</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                className="bg-slate-800 border-slate-700 text-slate-100 text-sm h-9 [color-scheme:dark] focus-visible:ring-1 focus-visible:ring-slate-500 focus-visible:ring-offset-0"
              />
            </div>
          </div>

          {/* Facility filter + actions */}
          <div className="flex flex-col sm:flex-row gap-3 items-end justify-between pt-1 border-t border-slate-800">
            <div className="w-full sm:max-w-xs space-y-1.5">
              <Label className="text-xs font-medium text-slate-400">Facility ID</Label>
              <Input
                placeholder="Filter by facility UUID…"
                value={facilityInput}
                onChange={(e) => setFacilityInput(e.target.value)}
                className="bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500 text-sm h-9 focus-visible:ring-1 focus-visible:ring-slate-500 focus-visible:ring-offset-0"
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {hasFilters && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleReset}
                  className="text-slate-400 hover:text-slate-200 text-sm h-9 px-3"
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                  Clear
                </Button>
              )}
              <Button
                type="submit"
                className="bg-slate-100 text-slate-900 hover:bg-white font-semibold h-9 px-5 text-sm"
              >
                Apply Filters
              </Button>
            </div>
          </div>
        </form>

        {/* Stats bar */}
        {!isLoading && !isError && totalLogs > 0 && (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Activity className="h-3.5 w-3.5" />
            <span>
              <span className="font-semibold text-slate-200">{totalLogs.toLocaleString()}</span> log entries
              {hasFilters && <span className="text-slate-500"> matching current filters</span>}
            </span>
          </div>
        )}

        {/* Logs table */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
          {/* Table header */}
          <div
            className="grid border-b border-slate-800 bg-slate-950/60"
            style={{ gridTemplateColumns: '1fr 1fr 1.4fr 0.7fr 0.9fr' }}
          >
            {['Action', 'Actor', 'Target Entity', 'Context', 'Timestamp'].map((h, i) => (
              <div
                key={h}
                className={`px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-slate-500 ${i > 0 ? 'border-l border-white/5' : 'pl-[3.25rem]'} ${i === 4 ? 'text-right' : ''}`}
              >
                {h}
              </div>
            ))}
          </div>

          {/* Body */}
          <div className="divide-y-0">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr 1.4fr 0.7fr 0.9fr' }}>
                    <div className="px-4 py-3 flex items-center gap-3">
                      <Skeleton className="h-5 w-5 rounded-full bg-slate-800" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-16 rounded-full bg-slate-800" />
                        <Skeleton className="h-3.5 w-24 bg-slate-800" />
                      </div>
                    </div>
                    <div className="px-4 py-3 space-y-2">
                      <Skeleton className="h-3.5 w-20 bg-slate-800" />
                      <Skeleton className="h-4 w-16 rounded-full bg-slate-800" />
                    </div>
                    <div className="px-4 py-3 space-y-2">
                      <Skeleton className="h-3.5 w-14 bg-slate-800" />
                      <Skeleton className="h-3 w-36 bg-slate-800" />
                    </div>
                    <div className="px-4 py-3">
                      <Skeleton className="h-3 w-16 bg-slate-800" />
                    </div>
                    <div className="px-4 py-3 flex flex-col items-end gap-1.5">
                      <Skeleton className="h-3.5 w-20 bg-slate-800" />
                      <Skeleton className="h-3 w-14 bg-slate-800" />
                    </div>
                  </div>
                ))}
              </div>
            ) : isError ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-500">
                <div className="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                </div>
                <p className="font-medium text-red-400">Failed to load audit logs</p>
                <p className="text-sm text-slate-500">Check your connection or try again.</p>
              </div>
            ) : logs.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3">
                <div className="h-12 w-12 rounded-full bg-slate-800 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-slate-500" />
                </div>
                <p className="font-semibold text-slate-300">No logs found</p>
                <p className="text-sm text-slate-500 max-w-sm text-center">
                  {hasFilters ? 'No entries match the current filters. Try adjusting or clearing them.' : 'Audit log entries will appear here as activity occurs.'}
                </p>
                {hasFilters && (
                  <Button variant="outline" size="sm" onClick={handleReset} className="mt-1 border-slate-700 text-slate-300 hover:bg-slate-800">
                    Clear Filters
                  </Button>
                )}
              </div>
            ) : (
              logs.map((log: AuditLog) => (
                <LogRow
                  key={log.id}
                  log={log}
                  isExpanded={!!expandedRows[log.id]}
                  onToggle={() => toggleRow(log.id)}
                />
              ))
            )}
          </div>
        </div>

        {/* Pagination */}
        {!isLoading && !isError && totalLogs > 0 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Showing{' '}
              <span className="font-medium text-slate-300">{(page - 1) * limit + 1}–{Math.min(page * limit, totalLogs)}</span>
              {' '}of <span className="font-medium text-slate-300">{totalLogs.toLocaleString()}</span>
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page === 1}
                className="border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 disabled:opacity-40 h-8 px-3 text-xs"
              >
                Previous
              </Button>
              <span className="text-sm text-slate-400 font-medium tabular-nums px-1">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                disabled={page >= totalPages}
                className="border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 disabled:opacity-40 h-8 px-3 text-xs"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
