import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  name: string;
  roles: string[];
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  token: string | null;
  refreshToken: string | null;
  setUser: (user: User) => void;
  clearUser: () => void;
  setIsAuthenticated: (isAuthenticated: boolean) => void;
  setTokens: (token: string, refreshToken: string) => void;
  clearTokens: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      token: null,
      refreshToken: null,
      setUser: (user: User) => set({ user }),
      clearUser: () => set({ user: null, isAuthenticated: false }),
      setIsAuthenticated: (isAuthenticated: boolean) => set({ isAuthenticated }),
      setTokens: (token: string, refreshToken: string) => 
        set({ token, refreshToken }),
      clearTokens: () => set({ token: null, refreshToken: null }),
    } as AuthState),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        user: state.user, 
        isAuthenticated: state.isAuthenticated,
        token: state.token,
        refreshToken: state.refreshToken
      }),
    }
  )
);
