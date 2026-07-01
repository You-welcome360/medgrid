import { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ArrowLeftRight,
  Package,
  Building2,
  Map,
  Bell,
  BarChart3,
  Settings,
  Users,
  ClipboardCheck,
  Monitor,
  FileText,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Globe,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { useRole } from '@/hooks/use-role';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

// ============================================================
// Nav items per role
// ============================================================

const facilityNavItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/requests', icon: ArrowLeftRight, label: 'Requests' },
  { to: '/inventory', icon: Package, label: 'Inventory' },
  { to: '/facilities', icon: Building2, label: 'Facilities' },
  { to: '/network', icon: Map, label: 'Network Map' },
  { to: '/network-directory', icon: Globe, label: 'Network Directory' },
  { to: '/notifications', icon: Bell, label: 'Notifications' },
  { to: '/reports', icon: BarChart3, label: 'Reports' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

const facilityAdminNavItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/requests', icon: ArrowLeftRight, label: 'Requests' },
  { to: '/inventory', icon: Package, label: 'Inventory' },
  { to: '/facilities', icon: Building2, label: 'Facilities' },
  { to: '/users', icon: Users, label: 'Team' },
  { to: '/network', icon: Map, label: 'Network Map' },
  { to: '/network-directory', icon: Globe, label: 'Network Directory' },
  { to: '/notifications', icon: Bell, label: 'Notifications' },
  { to: '/reports', icon: BarChart3, label: 'Reports' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

const adminNavItems = [
  { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Admin Dashboard' },
  { to: '/admin/approvals', icon: ClipboardCheck, label: 'Facility Approvals' },
  { to: '/admin/users', icon: Users, label: 'Users' },
  { to: '/admin/monitoring', icon: Monitor, label: 'System Monitoring' },
  { to: '/admin/reports', icon: BarChart3, label: 'Reports' },
  { to: '/admin/audit', icon: FileText, label: 'Audit Logs' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

// ============================================================
// Sidebar nav link
// ============================================================

function NavItem({
  to,
  icon: Icon,
  label,
}: {
  to: string;
  icon: React.ElementType;
  label: string;
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
          isActive
            ? 'bg-white/10 text-white'
            : 'text-gray-400 hover:bg-white/5 hover:text-white'
        )
      }
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </NavLink>
  );
}

// ============================================================
// Sidebar
// ============================================================

function Sidebar({ onClose }: { onClose?: () => void }) {
  const { user, logout } = useAuth();
  const { isSuperAdmin, isFacilityAdmin } = useRole();
  const items = isSuperAdmin
    ? adminNavItems
    : isFacilityAdmin
      ? facilityAdminNavItems
      : facilityNavItems;

  const initials = user
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : 'U';

  return (
    <div className="flex h-full flex-col bg-gray-950 text-white">
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white">
            <span className="text-sm font-bold text-gray-950">M</span>
          </div>
          <span className="font-semibold">MedGrid</span>
        </div>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-400 hover:text-white lg:hidden"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {items.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}
      </nav>

      {/* User footer */}
      <div className="border-t border-white/10 p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm hover:bg-white/5">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-white/10 text-white text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-white">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="truncate text-xs text-gray-400">{user?.email}</p>
              </div>
              <ChevronDown className="h-3 w-3 text-gray-400" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-56">
            <DropdownMenuItem onClick={() => {}}>Profile</DropdownMenuItem>
            <DropdownMenuItem onClick={() => {}}>
              Change Password
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={logout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// ============================================================
// Layout
// ============================================================

export function DashboardLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

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
        {/* Mobile topbar */}
        <header className="flex h-14 items-center gap-3 border-b px-4 lg:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
          </Sheet>
          <span className="font-semibold">MedGrid</span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
