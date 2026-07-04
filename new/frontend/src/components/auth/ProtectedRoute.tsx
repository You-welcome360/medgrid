import { Navigate, Outlet } from 'react-router-dom';
import type { Role } from '@/types/auth';

const getSession = () => {
  const token = localStorage.getItem('medgrid_token');
  const userStr = localStorage.getItem('medgrid_user');
  if (!token || !userStr) return null;

  try {
    return {
      token,
      user: JSON.parse(userStr),
    };
  } catch {
    return null;
  }
};

// Guests only (e.g. login)
export function GuestRoute() {
  const session = getSession();
  if (session) {
    if (session.user.is_first_login) {
      return <Navigate to="/reset-password" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }
  return <Outlet />;
}

// First login forced password reset
export function FirstLoginRoute() {
  const session = getSession();
  if (!session) {
    return <Navigate to="/login" replace />;
  }
  if (!session.user.is_first_login) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Outlet />;
}

// Authenticated protected routes
interface ProtectedRouteProps {
  allowedRoles?: Role[];
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const session = getSession();

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // Force reset password if first login
  if (session.user.is_first_login) {
    return <Navigate to="/reset-password" replace />;
  }

  // Verify role permissions
  if (allowedRoles && !allowedRoles.includes(session.user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}
