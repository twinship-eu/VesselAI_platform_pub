import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { AuthState, AppState, User, BreadcrumbItem } from '../types/auth';

interface AuthStore extends AuthState {
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  logout: () => void;
  clearError: () => void;
  updateAccessToken: (
    accessToken: string,
    expiry?: number,
    refreshToken?: string,
    backendAccessToken?: string,
    backendExpiry?: number
  ) => void;
}

interface AppStore extends AppState {
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  setCurrentRoute: (route: string) => void;
  setBreadcrumbs: (breadcrumbs: BreadcrumbItem[]) => void;
  setPageTitle: (title: string) => void;
  setColorMode: (mode: 'light' | 'dark') => void;
  toggleColorMode: () => void;
}

// Auth Store
export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      setUser: (user) => set({ 
        user,
        isAuthenticated: !!user,
        error: null
      }),

      setLoading: (isLoading) => set({ isLoading }),

      setError: (error) => set({ error, isLoading: false }),

      logout: () => set({ 
        user: null,
        isAuthenticated: false,
        error: null,
        isLoading: false
      }),
      updateAccessToken: (accessToken, expiry, refreshToken, backendAccessToken, backendExpiry) => set((state) => {
        if (!state.user) return {} as Partial<AuthStore>;
        return {
          user: {
            ...state.user,
            accessToken,
            refreshToken: refreshToken || state.user.refreshToken,
            tokenExpiry: expiry || state.user.tokenExpiry,
            backendAccessToken: backendAccessToken ?? state.user.backendAccessToken,
            backendTokenExpiry: backendExpiry ?? state.user.backendTokenExpiry,
          }
        } as Partial<AuthStore>;
      }),

      clearError: () => set({ error: null }),
    } as AuthStore),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Never persist tokens in localStorage (XSS risk). NextAuth keeps the
        // session token in an HttpOnly cookie; we re-seed access tokens from
        // `/api/auth/session` when needed.
        user: state.user
          ? {
              id: state.user.id,
              email: state.user.email,
              name: state.user.name,
              roles: state.user.roles,
              preferred_username: state.user.preferred_username,
              given_name: state.user.given_name,
              family_name: state.user.family_name,
              picture: state.user.picture,
              accessToken: '',
              refreshToken: '',
              tokenExpiry: 0,
              backendAccessToken: undefined,
              backendTokenExpiry: undefined,
            }
          : null,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// App Store
export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      sidebarCollapsed: false,
      currentRoute: '/admin/default',
      breadcrumbs: [],
      pageTitle: 'Main Dashboard',
      colorMode: 'light',

      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),

      toggleSidebar: () => set((state) => ({ 
        sidebarCollapsed: !state.sidebarCollapsed 
      })),

      setCurrentRoute: (currentRoute) => set({ currentRoute }),

      setBreadcrumbs: (breadcrumbs) => set({ breadcrumbs }),

      setPageTitle: (pageTitle) => set({ pageTitle }),

      setColorMode: (colorMode) => set({ colorMode }),

      toggleColorMode: () => set((state) => ({ 
        colorMode: state.colorMode === 'light' ? 'dark' : 'light' 
      })),
    } as AppStore),
    {
      name: 'app-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        colorMode: state.colorMode,
      }),
    }
  )
);
