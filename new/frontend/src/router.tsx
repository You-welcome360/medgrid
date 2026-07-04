import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute, FirstLoginRoute, GuestRoute } from '@/components/auth/ProtectedRoute';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

// Auth
import LoginPage from '@/pages/auth/LoginPage';
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage';
import ChangePasswordPage from '@/pages/auth/ChangePasswordPage';

// Core
import DashboardPage from '@/pages/DashboardPage';
import UnauthorizedPage from '@/pages/UnauthorizedPage';

// Inventory
import InventoryPage from '@/pages/inventory/InventoryPage';
import ResourceTypePage from '@/pages/inventory/ResourceTypePage';

// Admin
import CreateFacilityPage from '@/pages/admin/CreateFacilityPage';

// Facility
import ManagersPage from '@/pages/facility/ManagersPage';
import BalancePage from '@/pages/facility/BalancePage';
import FacilityProfilePage from '@/pages/facility/FacilityProfilePage';


// Coordination
import RequestsPage from '@/pages/coordination/RequestsPage';
import CreateRequestPage from '@/pages/coordination/CreateRequestPage';
import RequestDetailPage from '@/pages/coordination/RequestDetailPage';
import EmergencyBoardPage from '@/pages/coordination/EmergencyBoardPage';

// Notifications
import NotificationsPage from '@/pages/notifications/NotificationsPage';

// Settings
import NotificationPreferencesPage from '@/pages/settings/NotificationPreferencesPage';

const COORD_ROLES = ['SUPER_ADMIN', 'FACILITY_ADMIN', 'COORDINATION_MANAGER'] as const;

export const router = createBrowserRouter([
  // Root redirect
  { path: '/', element: <Navigate to="/dashboard" replace /> },

  // Guest-only (unauthenticated)
  {
    element: <GuestRoute />,
    children: [
      { path: '/login', element: <LoginPage /> },
    ],
  },

  // First-login forced password reset
  {
    element: <FirstLoginRoute />,
    children: [
      { path: '/reset-password', element: <ResetPasswordPage /> },
    ],
  },

  // All authenticated routes
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <DashboardLayout />,
        children: [

          // ── Dashboard ──────────────────────────────────────────────────
          { path: '/dashboard', element: <DashboardPage /> },

          // ── Inventory ──────────────────────────────────────────────────
          { path: '/inventory', element: <InventoryPage /> },
          { path: '/inventory/:resourceType', element: <ResourceTypePage /> },

          // ── Coordination (all roles except pure INVENTORY_MANAGER) ─────
          {
            element: <ProtectedRoute allowedRoles={[...COORD_ROLES]} />,
            children: [
              { path: '/coordination/requests', element: <RequestsPage /> },
              { path: '/coordination/requests/new', element: <CreateRequestPage /> },
              { path: '/coordination/requests/:id', element: <RequestDetailPage /> },
              { path: '/coordination/emergency', element: <EmergencyBoardPage /> },
            ],
          },

          // ── Facility balance ────────────────────────────────────────────
          { path: '/facility/balance', element: <BalancePage /> },

          // ── Facility profile ────────────────────────────────────────────
          { path: '/facility/profile', element: <FacilityProfilePage /> },

          // ── Notifications inbox ─────────────────────────────────────────
          { path: '/notifications', element: <NotificationsPage /> },

          // ── Super Admin ─────────────────────────────────────────────────
          {
            element: <ProtectedRoute allowedRoles={['SUPER_ADMIN']} />,
            children: [
              { path: '/admin/facilities/new', element: <CreateFacilityPage /> },
            ],
          },

          // ── Facility Admin ──────────────────────────────────────────────
          {
            element: <ProtectedRoute allowedRoles={['FACILITY_ADMIN']} />,
            children: [
              { path: '/facility/managers', element: <ManagersPage /> },
            ],
          },

          // ── Settings ───────────────────────────────────────────────────
          { path: '/settings/password', element: <ChangePasswordPage /> },
          { path: '/settings/notifications', element: <NotificationPreferencesPage /> },
        ],
      },
    ],
  },

  // Fallbacks
  { path: '/unauthorized', element: <UnauthorizedPage /> },
  { path: '*', element: <Navigate to="/dashboard" replace /> },
]);
