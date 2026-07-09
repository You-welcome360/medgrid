import { useState, useMemo } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useSocket } from '@/hooks/use-socket';
import {
  LayoutDashboard,
  ArrowLeftRight,
  Package,
  Map,
  Bell,
  Users,
  ClipboardCheck,
  Monitor,
  FileText,
  LogOut,
  Menu,
  X,
  Globe,
  Radio,
  RefreshCw,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { useRole } from '@/hooks/use-role';
import { useFacility } from '@/features/facilities/hooks/use-facilities';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { SOSPanicButton } from '@/components/shared/sos-panic-button';
import { useNotifications } from '@/hooks/use-notifications';

// ============================================================
// Nav items per role
// ============================================================

const facilityNavItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/sos-dashboard', icon: Radio, label: 'SOS Broadcasts' },
  { to: '/requests', icon: ArrowLeftRight, label: 'Requests' },
  { to: '/inventory', icon: Package, label: 'Inventory' },
  { to: '/redistribution', icon: RefreshCw, label: 'Redistribution' },
  { to: '/network', icon: Map, label: 'Network Map' },
  { to: '/network-directory', icon: Globe, label: 'Network Directory' },
];

const facilityAdminNavItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/sos-dashboard', icon: Radio, label: 'SOS Broadcasts' },
  { to: '/requests', icon: ArrowLeftRight, label: 'Requests' },
  { to: '/inventory', icon: Package, label: 'Inventory' },
  { to: '/redistribution', icon: RefreshCw, label: 'Redistribution' },
  { to: '/users', icon: Users, label: 'Team' },
  { to: '/network', icon: Map, label: 'Network Map' },
  { to: '/network-directory', icon: Globe, label: 'Network Directory' },
];

const adminNavItems = [
  { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Admin Dashboard' },
  { to: '/admin/approvals', icon: ClipboardCheck, label: 'Facility Approvals' },
  { to: '/admin/users', icon: Users, label: 'Users' },
  { to: '/network', icon: Map, label: 'Network Map' },
  { to: '/admin/monitoring', icon: Monitor, label: 'System Monitoring' },
  { to: '/admin/audit', icon: FileText, label: 'Audit Logs' },
];

// ============================================================
// Sidebar nav link
// ============================================================

function NavItem({
  to,
  icon: Icon,
  label,
  badge,
}: {
  to: string;
  icon: React.ElementType;
  label: string;
  badge?: React.ReactNode;
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors font-medium',
          isActive
            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
            : 'text-sidebar-foreground/75 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
        )
      }
    >
      <div className="flex items-center gap-3">
        <Icon className="h-4 w-4 shrink-0" />
        {label}
      </div>
      {badge}
    </NavLink>
  );
}

// ============================================================
// Sidebar
// ============================================================

function Sidebar({ onClose }: { onClose?: () => void }) {
  const { user } = useAuth();
  const { isSuperAdmin, isFacilityAdmin } = useRole();
  const { data: facility } = useFacility(user?.facilityId ?? '');

  const { data: unreadData } = useNotifications({
    page: 1,
    limit: 1,
    read: false,
  });

  const unreadCount = unreadData?.pagination?.total ?? 0;

  const items = isSuperAdmin
    ? adminNavItems
    : isFacilityAdmin
      ? facilityAdminNavItems
      : facilityNavItems;

  return (
    <div className="flex h-full flex-col bg-sidebar border-r border-sidebar-border text-sidebar-foreground">
      {/* Logo & Facility Info */}
      <div className="flex flex-col border-b border-sidebar-border px-4 py-3">
        <div className="flex h-10 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <span className="text-xs font-bold">M</span>
            </div>
            <span className="font-semibold text-sm text-sidebar-foreground">MedGrid</span>
          </div>
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              className="text-sidebar-foreground/60 hover:text-sidebar-foreground lg:hidden h-7 w-7"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        {facility && (
          <div className="mt-2 bg-sidebar-accent/40 border border-sidebar-border rounded-lg p-2">
            <p className="truncate text-xs font-semibold text-sidebar-foreground">
              {facility.name}
            </p>
            <p className="truncate text-[10px] text-primary uppercase tracking-wide font-semibold mt-0.5">
              {facility.type.replace('_', ' ')}
            </p>
          </div>
        )}
        {isSuperAdmin && (
          <div className="mt-2 bg-primary/10 border border-primary/20 rounded-lg p-2">
            <p className="truncate text-xs font-semibold text-primary">
              System Overwatch
            </p>
            <p className="truncate text-[10px] text-primary/80 uppercase tracking-wide font-semibold mt-0.5">
              Super Admin
            </p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {items.map((item) => {
          let badge = undefined;
          if (item.to === '/notifications' && unreadCount > 0) {
            badge = (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground leading-none">
                {unreadCount}
              </span>
            );
          }
          return <NavItem key={item.to} {...item} badge={badge} />;
        })}
      </nav>

    </div>
  );
}

// ============================================================
// Layout
// ============================================================

export function DashboardLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isSuperAdmin } = useRole();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: facility } = useFacility(user?.facilityId ?? '');
  const { data: unreadData } = useNotifications({
    page: 1,
    limit: 1,
    read: false,
  });

  const unreadCount = unreadData?.pagination?.total ?? 0;
  const initials = user
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : 'U';

  const socketEvents = useMemo(() => ({
    'request:created': (data: any) => {
      toast.info(`New request: ${data.itemName || 'item'} (${data.quantity} ${data.unit || ''})`);
      queryClient.invalidateQueries({ queryKey: ['requests'] });
    },
    'request:acknowledged': (data: any) => {
      toast.success(`Request acknowledged: ${data.itemName || 'item'}`);
      queryClient.invalidateQueries({ queryKey: ['requests'] });
    },
    'request:fulfilled': (data: any) => {
      toast.success(`Request fulfilled: ${data.itemName || 'item'}`);
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      queryClient.invalidateQueries({ queryKey: ['facilities'] });
    },
    'request:canceled': (data: any) => {
      toast.warning(`Request canceled: ${data.itemName || 'item'}`);
      queryClient.invalidateQueries({ queryKey: ['requests'] });
    },
    'balance:topup': (data: any) => {
      toast.success(`Balance top-up successful! New balance: ₵${Number(data.newBalance || data.balance || 0).toFixed(2)}`);
      queryClient.invalidateQueries({ queryKey: ['facilities'] });
    },
    'balance:low': (data: any) => {
      toast.error(`Warning: Balance is low! Current: ₵${Number(data.currentBalance || data.balance || 0).toFixed(2)}`);
      queryClient.invalidateQueries({ queryKey: ['facilities'] });
    },
  }), [queryClient]);

  useSocket(socketEvents);

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 lg:block">
        <Sidebar />
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-60 p-0">
          <Sidebar onClose={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar Header */}
        <header className="flex h-14 items-center justify-between border-b border-border px-6 bg-background text-foreground shrink-0">
          <div className="flex items-center gap-3">
            {/* Mobile sidebar trigger */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden h-8 w-8"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            
            <span className="font-semibold text-foreground hidden lg:inline">
              {facility ? `${facility.name} • ${facility.type.replace('_', ' ')}` : 'System Management'}
            </span>
            <span className="font-semibold text-foreground lg:hidden">
              {facility ? facility.name : 'MedGrid'}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Notification button */}
            <Button
              variant="ghost"
              size="icon"
              className="relative text-muted-foreground hover:text-foreground h-9 w-9 rounded-full"
              onClick={() => navigate('/notifications')}
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                  {unreadCount}
                </span>
              )}
            </Button>

            {/* Avatar Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2.5 rounded-lg focus:outline-none hover:opacity-90 cursor-pointer">
                  <div className="h-8 w-8 border border-border shadow-sm bg-primary/10 text-primary text-xs font-bold flex items-center justify-center rounded-lg select-none">
                    {initials}
                  </div>
                  <span className="hidden sm:inline text-sm font-medium text-foreground select-none">
                    {user?.firstName} {user?.lastName}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="flex flex-col px-3 py-2 text-xs text-muted-foreground">
                  <p className="font-semibold text-foreground">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="truncate mt-0.5">{user?.email}</p>
                  <p className="mt-1.5 inline-flex items-center rounded-md bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary w-fit">
                    {user?.role?.replace('_', ' ')}
                  </p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer" onClick={() => navigate('/settings')}>
                  Settings
                </DropdownMenuItem>
                {user?.facilityId && (
                  <DropdownMenuItem className="cursor-pointer" onClick={() => navigate('/balance')}>
                    Balance
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive cursor-pointer"
                  onClick={logout}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl p-6 relative">
            <Outlet />
            {!isSuperAdmin && <SOSPanicButton />}
          </div>
        </main>
      </div>
    </div>
  );
}
