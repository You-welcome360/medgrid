import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { setAccessToken } from '@/api/client';
import type { AuthenticatedUser } from '@/types';

interface AuthState {
  user: AuthenticatedUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: AuthenticatedUser, token: string) => void;
  clearAuth: () => void;
  updateUser: (user: AuthenticatedUser) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,

      setAuth: (user, token) => {
        setAccessToken(token);
        set({ user, accessToken: token, isAuthenticated: true });
      },

      clearAuth: () => {
        setAccessToken(null);
        set({ user: null, accessToken: null, isAuthenticated: false });
      },

      updateUser: (user) => {
        set({ user });
      },
    }),
    {
      name: 'medgrid-auth',
      // Only persist user — access token is re-issued on refresh
      partialize: (state) => ({ user: state.user }),
      onRehydrateStorage: () => (state) => {
        // On rehydration, access token needs to come from a /auth/refresh call
        // The app will attempt refresh on mount via useAuthInit
        if (state) {
          state.isAuthenticated = !!state.user;
        }
      },
    }
  )
);
