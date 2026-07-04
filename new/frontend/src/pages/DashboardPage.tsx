import React, { useState, useEffect } from 'react';
import {
  getFacilityInventory,
  getNetworkResources,
  getAdminReports,
  type InventoryItem,
  type NetworkResource,
  type AdminReportData,
  type FacilityWithInventory,
} from '@/services/inventoryService';

import {
  Activity,
  Globe,
  Package,
  Building,
} from 'lucide-react';


export default function DashboardPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [network, setNetwork] = useState<NetworkResource[]>([]);
  const [adminData, setAdminData] = useState<AdminReportData | null>(null);
  const [selectedFacility, setSelectedFacility] = useState<FacilityWithInventory | null>(null);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userStr = localStorage.getItem('medgrid_user');
  const user = userStr ? JSON.parse(userStr) : null;
  const userEmail = user?.email ?? 'Operator';
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const loadData = async () => {
    setFetching(true);
    setError(null);
    try {
      if (isSuperAdmin) {
        const data = await getAdminReports();
        setAdminData(data);
      } else {
        const [invData, netData] = await Promise.all([
          getFacilityInventory(),
          getNetworkResources(),
        ]);
        setInventory(invData.inventory);
        setNetwork(netData.resources);
      }
    } catch (err: any) {
      setError(err.message ?? 'Failed to synchronize workspace logs');
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totals = inventory.reduce(
    (acc, curr) => {
      if (acc && curr.quantity) acc.items += curr.quantity;
      if (acc && curr.available) acc.availableUnits += curr.available;
      return acc;
    },
    { items: 0, availableUnits: 0 }
  );

  if (isSuperAdmin && adminData) {
    return (
      <div className="space-y-6 text-slate-800 animate-in fade-in-50 duration-200">
        {/* Header */}
        <div className="flex justify-between items-center pb-2">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Super Administration</h2>
            <p className="text-xs text-slate-500 mt-1">
              Welcome back, {userEmail.split('@')[0]}! Here is the global network operational overview.
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <StatCard
            title="Registered Facilities"
            value={adminData.stats.totalFacilities.toString()}
            subtitle="Hospitals, blood banks, & suppliers active"
            icon={Building}
            trend="Active"
            trendType="positive"
          />
          <StatCard
            title="Global Exchange Stock"
            value={adminData.stats.totalMovableItems.toLocaleString()}
            subtitle="Total units of blood, drugs & supplies"
            icon={Package}
            trend="Movable"
            trendType="positive"
          />
          <StatCard
            title="Total Bed Capacity"
            value={adminData.stats.totalBedCapacity.toLocaleString()}
            subtitle="Available ICU beds across all hospitals"
            icon={Activity}
            trend="Fixed"
            trendType="positive"
          />
        </div>

        {/* Main Grid: Registered Facilities & Activity Log */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Facilities table */}
          <div className="lg:col-span-8 bg-white border border-slate-200/60 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Registered Network Facilities
              </h3>
            </div>
            {adminData.facilities.length === 0 ? (
              <div className="p-12 text-center text-sm text-slate-400 font-medium">
                No facilities registered in the system.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50/30 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200/80">
                      <th className="px-6 py-3.5">Facility Name</th>
                      <th className="px-6 py-3.5">Type</th>
                      <th className="px-6 py-3.5">Location</th>
                      <th className="px-6 py-3.5">Registry Size</th>
                      <th className="px-6 py-3.5">Contact Phone</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {adminData.facilities.map((fac) => (
                      <tr
                        key={fac.id}
                        className="hover:bg-slate-100/50 transition-colors cursor-pointer"
                        onClick={() => setSelectedFacility(fac)}
                      >
                        <td className="px-6 py-4 font-semibold text-slate-900">
                          {fac.name}
                        </td>
                        <td className="px-6 py-4 text-xs">
                          <span className="inline-block px-2.5 py-0.5 rounded font-bold uppercase tracking-widest text-[9px] bg-slate-100 border border-slate-200 text-slate-650">
                            {fac.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-500 font-medium">
                          {fac.location}
                        </td>
                        <td className="px-6 py-4 text-xs font-bold text-slate-700">
                          {fac.inventory.length} item records
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-500">
                          {fac.phone}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Recent audits */}
          <div className="lg:col-span-4 bg-white border border-slate-200/60 rounded-2xl shadow-sm overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Recent Network Activity
              </h3>
            </div>
            <div className="p-6 divide-y divide-slate-100 overflow-y-auto max-h-[350px] flex-1">
              {adminData.recentActivity.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 font-medium">
                  No network actions logged yet.
                </div>
              ) : (
                adminData.recentActivity.map((log) => (
                  <div key={log.id} className="py-3 first:pt-0 last:pb-0 space-y-1">
                    <div className="flex justify-between items-start">
                      <span className="text-[11px] font-bold text-slate-900 truncate max-w-[70%]">
                        {log.userEmail}
                      </span>
                      <span className="text-[9px] text-slate-400 font-medium whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-550 font-medium leading-relaxed">
                      Updated <span className="font-semibold text-slate-700">{log.bloodGroup ? `Blood (${log.bloodGroup.replace('_', ' ')})` : (log.resourceName || log.resourceType.replace('_', ' '))}</span> at <span className="font-semibold text-slate-705">{log.facilityName}</span>.
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Selected Facility Inventory Details Modal */}
        {selectedFacility && (
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="w-full max-w-3xl bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl space-y-4 text-slate-800 animate-in zoom-in-95 duration-100">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">
                    {selectedFacility.name} Registry
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium mt-1">
                    {selectedFacility.type} • {selectedFacility.location}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedFacility(null)}
                  className="text-slate-450 hover:text-slate-650 font-semibold text-xs uppercase tracking-wider transition-colors"
                >
                  Close
                </button>
              </div>

              {selectedFacility.inventory.length === 0 ? (
                <div className="p-12 text-center text-sm text-slate-400 font-medium">
                  This facility has not registered any inventory items yet.
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto border border-slate-200/60 rounded-xl">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200/80">
                        <th className="px-4 py-3">Resource Type</th>
                        <th className="px-4 py-3">Item Details</th>
                        <th className="px-4 py-3 text-right">Movable / Fixed</th>
                        <th className="px-4 py-3 text-right">Quantity / Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedFacility.inventory.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-3.5 font-semibold text-slate-900">
                            {item.resourceType}
                          </td>
                          <td className="px-4 py-3.5 text-xs text-slate-505">
                            {item.resourceType === 'BLOOD' && item.bloodGroup && `Group: ${item.bloodGroup.replace('_', ' ')}`}
                            {item.resourceType !== 'BLOOD' && (item.name || 'Generic')}
                          </td>
                          <td className="px-4 py-3.5 text-right text-xs">
                            {item.isMovable ? (
                              <span className="text-indigo-650 font-bold uppercase tracking-wider text-[9px] bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
                                Movable
                              </span>
                            ) : (
                              <span className="text-slate-500 font-bold uppercase tracking-wider text-[9px] bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                                Fixed Node
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-right font-bold text-slate-800">
                            {item.isMovable ? (
                              <span>{item.quantity} units</span>
                            ) : (
                              <span>{item.available} / {item.total} available</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 text-slate-800">
      {/* Minimalist Dashboard Header */}
      <div className="flex justify-between items-center pb-2">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Dashboard</h2>
          <p className="text-xs text-slate-500 mt-1">
            Welcome back, {userEmail.split('@')[0]}! Here is your facility's operational overview.
          </p>
        </div>
      </div>

      {fetching ? (
        <div className="p-12 flex items-center justify-center gap-2 text-slate-400 font-medium">
          <LoaderSpinner />
          Synchronizing workspace...
        </div>
      ) : error ? (
        <div className="p-8 text-center text-sm bg-red-50 border border-red-100 text-red-650 rounded-2xl font-medium">
          {error}
        </div>
      ) : (
        <>
          {/* Stats bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <StatCard
              title="Active Exchange Stock"
              value={totals.items.toLocaleString()}
              subtitle="Moveable resources inside facility"
              icon={Package}
              trend="+2.14%"
              trendType="positive"
            />
            <StatCard
              title="Bed & Facility Capacity"
              value={totals.availableUnits.toLocaleString()}
              subtitle="Currently free rooms and devices"
              icon={Activity}
              trend="+1.64%"
              trendType="positive"
            />
            <StatCard
              title="Global Exchange Nodes"
              value={network.length.toString()}
              subtitle="Active distinct resources on map"
              icon={Globe}
              trend="-1.56%"
              trendType="negative"
            />
          </div>

          {/* Analytics Dashboard Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-5 bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm">
              <LedgerVolumeChart />
            </div>
            <div className="lg:col-span-7 bg-white border border-slate-200/60 rounded-2xl p-5 shadow-sm">
              <ExchangeTrendsChart />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================
// Subcomponents / Mini Helpers
// ============================================================

function LoaderSpinner() {
  return (
    <svg className="animate-spin h-5 w-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendType,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: any;
  trend: string;
  trendType: 'positive' | 'negative';
}) {
  return (
    <div className="bg-white border border-slate-200/60 rounded-2xl p-5 flex items-center justify-between shadow-sm relative overflow-hidden">
      <div className="space-y-1">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{title}</p>
        <div className="flex items-baseline gap-2 pt-0.5">
          <h4 className="text-3xl font-black text-slate-900 tracking-tight">{value}</h4>
          <span className={`inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${
            trendType === 'positive'
              ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
              : 'bg-rose-50 text-rose-600 border-rose-100'
          }`}>
            {trend}
          </span>
        </div>
        <p className="text-[11px] text-slate-500 font-medium">{subtitle}</p>
      </div>
      <div className="h-10 w-10 rounded-xl flex items-center justify-center border border-slate-100 bg-slate-50/50 text-slate-500 shrink-0">
        <Icon className="h-4.5 w-4.5" />
      </div>
    </div>
  );
}

function LedgerVolumeChart() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const data = [
    { label: 'Mon', value: 45 },
    { label: 'Tue', value: 82 },
    { label: 'Wed', value: 65 },
    { label: 'Thu', value: 110 },
    { label: 'Fri', value: 95 },
    { label: 'Sat', value: 40 },
    { label: 'Sun', value: 70 },
  ];

  const maxVal = 120;
  const chartHeight = 150;
  const chartWidth = 320;
  const barWidth = 24;
  const gap = 16;
  const paddingLeft = 30;
  const paddingBottom = 25;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-sm font-bold text-slate-800">Ledger Volume</h3>
          <p className="text-[11px] text-slate-400 font-medium">Daily transaction validations</p>
        </div>
        <div className="flex items-center gap-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-slate-800"></span>Blocks</span>
        </div>
      </div>

      <div className="relative pt-2">
        <svg className="w-full overflow-visible" viewBox={`0 0 ${chartWidth} ${chartHeight + paddingBottom}`}>
          {/* Y Axis grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
            const y = chartHeight * (1 - ratio);
            const val = Math.round(maxVal * ratio);
            return (
              <g key={i}>
                <line x1={paddingLeft} y1={y} x2={chartWidth} y2={y} stroke="#f1f5f9" strokeWidth="1" />
                <text x={paddingLeft - 8} y={y + 4} textAnchor="end" className="fill-slate-400 font-sans font-bold text-[9px]">
                  {val}
                </text>
              </g>
            );
          })}

          {/* Bars */}
          {data.map((item, idx) => {
            const barHeight = (item.value / maxVal) * chartHeight;
            const x = paddingLeft + idx * (barWidth + gap) + gap/2;
            const y = chartHeight - barHeight;
            const isHovered = hoveredIndex === idx;

            return (
              <g
                key={idx}
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                className="cursor-pointer"
              >
                {/* Background column trigger area */}
                <rect
                  x={x - gap/2}
                  y={0}
                  width={barWidth + gap}
                  height={chartHeight}
                  fill="transparent"
                />
                {/* Bar */}
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  rx="6"
                  className={`transition-all duration-200 ${
                    isHovered ? 'fill-slate-800 shadow-md' : 'fill-slate-700/80'
                  }`}
                />
                {/* X Axis labels */}
                <text
                  x={x + barWidth / 2}
                  y={chartHeight + 16}
                  textAnchor="middle"
                  className={`font-sans font-bold text-[10px] transition-colors duration-150 ${
                    isHovered ? 'fill-slate-800 font-extrabold' : 'fill-slate-450'
                  }`}
                >
                  {item.label}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Tooltip */}
        {hoveredIndex !== null && (
          <div
            className="absolute bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-md pointer-events-none transform -translate-x-1/2 -translate-y-full transition-all duration-100"
            style={{
              left: `${((paddingLeft + hoveredIndex * (barWidth + gap) + gap/2 + barWidth/2) / chartWidth) * 100}%`,
              top: `${((chartHeight - (data[hoveredIndex].value / maxVal) * chartHeight) / (chartHeight + paddingBottom)) * 100 - 4}%`,
            }}
          >
            {data[hoveredIndex].value} txs
          </div>
        )}
      </div>
    </div>
  );
}

function ExchangeTrendsChart() {
  const [activePoint, setActivePoint] = useState<{ idx: number; x: number; y: number } | null>(null);

  const data = [
    { label: 'Jan', inflow: 45, outflow: 30 },
    { label: 'Feb', inflow: 72, outflow: 48 },
    { label: 'Mar', inflow: 58, outflow: 40 },
    { label: 'Apr', inflow: 88, outflow: 55 },
    { label: 'May', inflow: 76, outflow: 68 },
    { label: 'Jun', inflow: 95, outflow: 70 },
  ];

  const maxVal = 100;
  const chartHeight = 150;
  const chartWidth = 480;
  const paddingLeft = 30;
  const paddingRight = 10;
  const paddingBottom = 25;

  const pointGap = (chartWidth - paddingLeft - paddingRight) / (data.length - 1);

  // Calculate points
  const points = data.map((d, i) => {
    const x = paddingLeft + i * pointGap;
    const yIn = chartHeight - (d.inflow / maxVal) * chartHeight;
    const yOut = chartHeight - (d.outflow / maxVal) * chartHeight;
    return { x, yIn, yOut, label: d.label, inflow: d.inflow, outflow: d.outflow };
  });

  // Create path strings
  const linePathInflow = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.yIn}`).join(' ');
  const linePathOutflow = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.yOut}`).join(' ');

  // Create area path strings (close the path to the bottom)
  const areaPathInflow = `${linePathInflow} L ${points[points.length - 1].x} ${chartHeight} L ${points[0].x} ${chartHeight} Z`;
  const areaPathOutflow = `${linePathOutflow} L ${points[points.length - 1].x} ${chartHeight} L ${points[0].x} ${chartHeight} Z`;

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;

    // Find closest index
    let closestIdx = 0;
    let minDiff = Infinity;

    points.forEach((p, idx) => {
      const diff = Math.abs(p.x - (mouseX / rect.width) * chartWidth);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = idx;
      }
    });

    const p = points[closestIdx];
    setActivePoint({
      idx: closestIdx,
      x: p.x,
      y: (p.yIn + p.yOut) / 2
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-sm font-bold text-slate-800">Exchange Trends</h3>
          <p className="text-[11px] text-slate-400 font-medium">Resource flow dynamics</p>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-wider text-slate-450">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-800"></span>
            Inflow
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-cyan-500"></span>
            Outflow
          </span>
        </div>
      </div>

      <div className="relative pt-2">
        <svg
          className="w-full overflow-visible"
          viewBox={`0 0 ${chartWidth} ${chartHeight + paddingBottom}`}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setActivePoint(null)}
        >
          <defs>
            <linearGradient id="inflowGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1e293b" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#1e293b" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="outflowGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Y Axis grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
            const y = chartHeight * (1 - ratio);
            const val = Math.round(maxVal * ratio);
            return (
              <g key={i}>
                <line x1={paddingLeft} y1={y} x2={chartWidth - paddingRight} y2={y} stroke="#f1f5f9" strokeWidth="1" />
                <text x={paddingLeft - 8} y={y + 4} textAnchor="end" className="fill-slate-400 font-sans font-bold text-[9px]">
                  {val}
                </text>
              </g>
            );
          })}

          {/* Area under curves */}
          <path d={areaPathInflow} fill="url(#inflowGrad)" />
          <path d={areaPathOutflow} fill="url(#outflowGrad)" />

          {/* Main lines */}
          <path d={linePathInflow} fill="none" stroke="#1e293b" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          <path d={linePathOutflow} fill="none" stroke="#06b6d4" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />

          {/* Grid vertical dots/dashes */}
          {points.map((p, idx) => (
            <g key={idx}>
              {/* X axis labels */}
              <text x={p.x} y={chartHeight + 16} textAnchor="middle" className="fill-slate-400 font-sans font-bold text-[10px]">
                {p.label}
              </text>
            </g>
          ))}

          {/* Interactive cursor line */}
          {activePoint && (
            <g>
              <line
                x1={activePoint.x}
                y1={0}
                x2={activePoint.x}
                y2={chartHeight}
                stroke="#cbd5e1"
                strokeWidth="1"
                strokeDasharray="3,3"
              />
              <circle cx={activePoint.x} cy={points[activePoint.idx].yIn} r="4" fill="#1e293b" stroke="white" strokeWidth="1.5" className="shadow" />
              <circle cx={activePoint.x} cy={points[activePoint.idx].yOut} r="4" fill="#06b6d4" stroke="white" strokeWidth="1.5" className="shadow" />
            </g>
          )}
        </svg>

        {/* Tooltip */}
        {activePoint && (
          <div
            className="absolute bg-slate-900/95 text-white text-[10px] font-bold p-2.5 rounded-xl shadow-lg pointer-events-none transform -translate-y-full transition-all duration-75 flex flex-col gap-1 border border-white/10"
            style={{
              left: `${(activePoint.x / chartWidth) * 100}%`,
              top: `${(activePoint.y / (chartHeight + paddingBottom)) * 100 - 8}%`,
              transform: `translate(-50%, -100%)`
            }}
          >
            <div className="text-slate-400 text-[9px] font-medium border-b border-white/15 pb-1">
              Month: {data[activePoint.idx].label}
            </div>
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-400"></span>
              <span>Inflow: <span className="font-extrabold text-slate-200">{data[activePoint.idx].inflow}</span></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-450"></span>
              <span>Outflow: <span className="font-extrabold text-cyan-400">{data[activePoint.idx].outflow}</span></span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
