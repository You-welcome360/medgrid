import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import { AuthLayout } from '@/layouts/auth-layout';
import { DashboardLayout } from '@/layouts/dashboard-layout';
import { ProtectedRoute } from './protected-route';

// Pages — lazy loaded
import { lazy, Suspense } from 'react';
import { LoadingScreen } from '@/components/shared/loading-screen';

const LoginPage = lazy(() => import('@/pages/auth/login'));
const RegisterPage = lazy(() => import('@/pages/auth/register'));
const ChangePasswordPage = lazy(() => import('@/pages/auth/change-password'));
const CompleteInvitationPage = lazy(
  () => import('@/pages/auth/complete-invitation')
);

// Facility / operational pages
const DashboardPage = lazy(() => import('@/pages/dashboard'));
const RequestsPage = lazy(() => import('@/pages/requests'));
const InventoryPage = lazy(() => import('@/pages/inventory'));
const FacilitiesPage = lazy(() => import('@/pages/facilities'));
const FacilityUsersPage = lazy(() => import('@/pages/users'));
const NotificationsPage = lazy(() => import('@/pages/notifications'));
const ReportsPage = lazy(() => import('@/pages/reports'));
const SettingsPage = lazy(() => import('@/pages/settings'));

// Super admin pages
const AdminDashboardPage = lazy(() => import('@/pages/admin/dashboard'));
const FacilityApprovalsPage = lazy(() => import('@/pages/admin/approvals'));
const UsersPage = lazy(() => import('@/pages/admin/users'));

const ADMIN_ROLES = ['SUPER_ADMIN'] as const;
const FACILITY_ROLES = [
  'FACILITY_ADMIN',
  'COORDINATION_MANAGER',
  'INVENTORY_MANAGER',
] as const;
const ALL_ROLES = [...ADMIN_ROLES, ...FACILITY_ROLES] as const;

function SuspenseWrapper({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<LoadingScreen />}>{children}</Suspense>;
}

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth routes */}
        <Route element={<AuthLayout />}>
          <Route
            path="/login"
            element={
              <SuspenseWrapper>
                <LoginPage />
              </SuspenseWrapper>
            }
          />
          <Route
            path="/register"
            element={
              <SuspenseWrapper>
                <RegisterPage />
              </SuspenseWrapper>
            }
          />
          <Route
            path="/invite/complete"
            element={
              <SuspenseWrapper>
                <CompleteInvitationPage />
              </SuspenseWrapper>
            }
          />
          <Route
            path="/change-password"
            element={
              <ProtectedRoute allowedRoles={[...ALL_ROLES]}>
                <SuspenseWrapper>
                  <ChangePasswordPage />
                </SuspenseWrapper>
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Facility / operational routes */}
        <Route
          element={
            <ProtectedRoute allowedRoles={[...FACILITY_ROLES]}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route
            path="/dashboard"
            element={
              <SuspenseWrapper>
                <DashboardPage />
              </SuspenseWrapper>
            }
          />
          <Route
            path="/requests/*"
            element={
              <SuspenseWrapper>
                <RequestsPage />
              </SuspenseWrapper>
            }
          />
          <Route
            path="/inventory/*"
            element={
              <SuspenseWrapper>
                <InventoryPage />
              </SuspenseWrapper>
            }
          />
          <Route
            path="/facilities/*"
            element={
              <SuspenseWrapper>
                <FacilitiesPage />
              </SuspenseWrapper>
            }
          />
          <Route
            path="/notifications"
            element={
              <SuspenseWrapper>
                <NotificationsPage />
              </SuspenseWrapper>
            }
          />
          <Route
            path="/reports"
            element={
              <SuspenseWrapper>
                <ReportsPage />
              </SuspenseWrapper>
            }
          />
          <Route
            path="/settings"
            element={
              <SuspenseWrapper>
                <SettingsPage />
              </SuspenseWrapper>
            }
          />
          {/* FACILITY_ADMIN only */}
          <Route
            path="/users"
            element={
              <ProtectedRoute allowedRoles={['FACILITY_ADMIN']}>
                <SuspenseWrapper>
                  <FacilityUsersPage />
                </SuspenseWrapper>
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Super admin routes */}
        <Route
          element={
            <ProtectedRoute allowedRoles={[...ADMIN_ROLES]}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route
            path="/admin/dashboard"
            element={
              <SuspenseWrapper>
                <AdminDashboardPage />
              </SuspenseWrapper>
            }
          />
          <Route
            path="/admin/approvals/*"
            element={
              <SuspenseWrapper>
                <FacilityApprovalsPage />
              </SuspenseWrapper>
            }
          />
          <Route
            path="/admin/users"
            element={
              <SuspenseWrapper>
                <UsersPage />
              </SuspenseWrapper>
            }
          />
        </Route>

        {/* Redirects */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route
          path="/unauthorized"
          element={<div className="p-8 text-center">Access denied.</div>}
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;
