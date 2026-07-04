import { Link, useNavigate, useLocation, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  PlusCircle,
  LogOut,
  Key,
  Package,
  ArrowLeftRight,
  Wallet,
  Bell,
  Zap,
  Settings,
  Building2,
} from 'lucide-react';

import { useUnreadCount } from '@/hooks/useUnreadCount';
import { useSocket } from '@/hooks/useSocket';

export function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  // Connect socket for the lifetime of the layout
  useSocket();
  const { count: unreadCount } = useUnreadCount();

  const userStr = localStorage.getItem('medgrid_user');
  const user = userStr ? JSON.parse(userStr) : null;

  const handleLogout = () => {
    localStorage.removeItem('medgrid_token');
    localStorage.removeItem('medgrid_user');
    navigate('/login', { replace: true });
  };

  if (!user) return null;

  const isSuperAdmin = user.role === 'SUPER_ADMIN';
  const isFacilityAdmin = user.role === 'FACILITY_ADMIN';
  const isCoordinator =
    user.role === 'COORDINATION_MANAGER' ||
    user.role === 'FACILITY_ADMIN' ||
    isSuperAdmin;

  const menuItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/inventory', label: 'Resource Registry', icon: Package },
    // Coordination — visible to everyone except pure inventory managers
    ...(isCoordinator
      ? [
          { to: '/coordination/requests', label: 'Coordination', icon: ArrowLeftRight },
          { to: '/coordination/emergency', label: 'Emergency Board', icon: Zap },
        ]
      : []),
    // Balance — visible to facility users (not super admin sidebar, they see it on dashboard)
    ...(!isSuperAdmin
      ? [
          { to: '/facility/balance', label: 'Facility Balance', icon: Wallet },
          { to: '/facility/profile', label: 'Facility Profile', icon: Building2 },
        ]
      : []),
    // Super Admin
    ...(isSuperAdmin
      ? [{ to: '/admin/facilities/new', label: 'New Facility', icon: PlusCircle }]
      : []),
    // Facility Admin
    ...(isFacilityAdmin
      ? [{ to: '/facility/managers', label: 'Manage Staff', icon: Users }]
      : []),
    // Settings
    { to: '/settings/password', label: 'Change Password', icon: Key },
    { to: '/settings/notifications', label: 'Notifications', icon: Settings },
  ];

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-800 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200/80 flex flex-col justify-between shrink-0 text-slate-800 shadow-sm relative z-20">
        <div>
          {/* Logo */}
          <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3">
            <img src="/MEDGRID-logo.png" alt="MedGrid Logo" className="h-15 w-60 object-cover" />
          </div>

          <div className="px-6 pt-5 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Main Menu
          </div>

          {/* User badge */}
          <div className="mx-4 my-3 p-3 bg-slate-50 rounded-xl border border-slate-200/60 flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 font-bold text-sm shrink-0">
              {user.email[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-800 truncate">{user.email.split('@')[0]}</p>
              <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">
                {user.role.replace(/_/g, ' ')}
              </p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="py-2 space-y-0.5">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.to === '/coordination/requests'
                  ? location.pathname.startsWith('/coordination/requests')
                  : location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-3 px-4 py-2.5 mx-3 rounded-xl text-sm font-semibold transition-all duration-150 ${
                    isActive
                      ? 'bg-[#d7f7f9] text-[#0d7885] shadow-sm'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div>
          {/* Ledger Sync indicator */}
          <div className="mx-4 my-3 p-3 bg-slate-50/80 border border-slate-200/50 rounded-xl flex items-center gap-2.5 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-450 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <div className="min-w-0">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Ledger Status</p>
              <p className="text-[11px] font-semibold text-slate-600 mt-1 leading-none">Synced & Active</p>
            </div>
          </div>

          {/* Logout */}
          <div className="p-4 border-t border-slate-100 bg-slate-50/50">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-sm font-bold transition-all duration-150 cursor-pointer border border-red-200/50"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-slate-200/80 flex items-center justify-between px-8 bg-white shadow-sm sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <h1 className="text-sm font-bold text-slate-900 uppercase tracking-widest">
              {isSuperAdmin ? 'Super Administration' : 'Facility Operations Desk'}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Notification Bell */}
            <Link
              to="/notifications"
              className="relative p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-500 hover:text-slate-800 transition-all"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>

            {user.facility_id && (
              <div className="text-xs text-slate-500 font-semibold bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200/80">
                Facility Ref:{' '}
                <span className="font-mono text-slate-700">{user.facility_id.slice(0, 8)}…</span>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
