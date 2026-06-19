import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { authApi } from '@/api/auth.api';
import { useAuthStore } from '@/stores/auth.store';

/**
 * Attempts a silent token refresh on mount.
 * Call this once at the app root.
 */
export function useAuthInit() {
  const { setAuth, clearAuth, user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        // If we have a persisted user, try to refresh the access token
        if (user) {
          const res = await authApi.refresh();
          if (res.data) {
            setAuth(res.data.user, res.data.accessToken);
          } else {
            clearAuth();
          }
        }
      } catch {
        clearAuth();
      } finally {
        setIsLoading(false);
      }
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { isLoading };
}

/**
 * Returns the current auth state and a logout function.
 */
export function useAuth() {
  const { user, isAuthenticated, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  const logout = async () => {
    try {
      await authApi.logout();
    } finally {
      clearAuth();
      navigate('/login', { replace: true });
    }
  };

  return { user, isAuthenticated, logout };
}
