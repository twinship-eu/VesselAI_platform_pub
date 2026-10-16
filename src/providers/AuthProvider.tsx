'use client';

import React, { createContext, useContext, useEffect, useRef, ReactNode } from 'react';
import { sanitizeForLog } from '../lib/sanitizeLog.js';
import { useSession, SessionProvider, signIn, signOut } from 'next-auth/react';
import { useAuthStore } from '../stores';
import { User } from '../types/auth';

interface AuthContextType {
  login: (callbackUrl?: string) => void;
  logout: () => Promise<void>;
  isLoading: boolean;
  user: User | null;
  isAuthenticated: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

function AuthProviderInner({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const { setUser, setLoading, user, isAuthenticated, logout: storeLogout } = useAuthStore();
  const initialTokenFetched = useRef(false);
  const sessionRecoveryInFlight = useRef(false);
  const silentSessionCheckInFlight = useRef(false);
  const hasRefreshError = (session as any)?.error === 'RefreshAccessTokenError';

  const tryRefreshFromTokenEndpoint = React.useCallback(async () => {
    try {
      const res = await fetch('/api/auth/token', { cache: 'no-store', credentials: 'include' });
      return res.ok;
    } catch {
      return false;
    }
  }, []);

  // F4: token-less session sync. Hitting /api/auth/session runs the NextAuth
  // jwt() refresh callback, keeping the access token fresh INSIDE the httpOnly
  // cookie — the browser never receives it. We only read the liveness hint
  // (hasAccessToken) + expiry (to schedule the next silent refresh) and seed
  // the user profile. No token is ever stored client-side.
  const fetchAndUpdateToken = React.useCallback(async () => {
    if (status !== 'authenticated' || !session) return;

    const seedUser = (tokenExpiry: number) => {
      const userData: User = {
        id: session.user?.id || '',
        email: session.user?.email || '',
        name: session.user?.name || '',
        roles: session.user?.roles || [],
        tokenExpiry,
        preferred_username: session.user?.preferred_username,
        given_name: session.user?.given_name,
        family_name: session.user?.family_name,
        picture: session.user?.picture,
      };
      setUser(userData);
    };

    try {
      const res = await fetch('/api/auth/session', { cache: 'no-store', credentials: 'include' });
      const data = await res.json().catch(() => ({} as any));
      const accessTokenExpires = data?.accessTokenExpires as number | undefined;
      const sessionError = data?.error as string | undefined;

      if (sessionError === 'RefreshAccessTokenError') {
        const recovered = await tryRefreshFromTokenEndpoint();
        if (!recovered) return;
        const retryRes = await fetch('/api/auth/session', { cache: 'no-store', credentials: 'include' });
        const retryData = await retryRes.json().catch(() => ({} as any));
        if (retryData?.error === 'RefreshAccessTokenError' || !retryData?.hasAccessToken) return;
        seedUser((retryData?.accessTokenExpires as number | undefined) || 0);
        return;
      }

      seedUser(accessTokenExpires || 0);
    } catch (err) {
      console.error('[AuthProvider] Failed to sync session:', err);
    }
  }, [session, status, setUser, tryRefreshFromTokenEndpoint]);

  useEffect(() => {
    if (status !== 'authenticated' || !hasRefreshError || sessionRecoveryInFlight.current) return;

    sessionRecoveryInFlight.current = true;
    initialTokenFetched.current = false;

    const recover = async () => {
      const signOutOnRefreshError = (process.env.NEXT_PUBLIC_SIGNOUT_ON_REFRESH_ERROR || 'false') === 'true';
      const recovered = await tryRefreshFromTokenEndpoint();
      if (recovered) {
        await fetchAndUpdateToken();
        sessionRecoveryInFlight.current = false;
        return;
      }

      if (!signOutOnRefreshError) {
        sessionRecoveryInFlight.current = false;
        return;
      }

      try {
        await signOut({ redirect: false });
      } catch {
        // ignore; fallback redirect still applies
      } finally {
        if (typeof window !== 'undefined') {
          const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
          const callbackUrl = window.location.href;
          const qs = new URLSearchParams({ reason: 'expired', callbackUrl });
          window.location.replace(`${basePath}/auth/signin?${qs.toString()}`);
        }
        sessionRecoveryInFlight.current = false;
      }
    };

    recover();
  }, [status, hasRefreshError, fetchAndUpdateToken, tryRefreshFromTokenEndpoint]);

  // Sync session status → loading state + initial user seed + ONE initial token fetch
  useEffect(() => {
    setLoading(status === 'loading');
    try {
      if (typeof window !== 'undefined') {
        if (status === 'loading') {
          window.localStorage.setItem('nextauth.sessionLoading', 'true');
        } else {
          window.localStorage.removeItem('nextauth.sessionLoading');
        }
      }
    } catch {
      // swallow
    }

    if (status === 'authenticated' && session && !hasRefreshError) {
      // Seed user object from session (only once)
      if (!initialTokenFetched.current) {
        const baseUser: User = {
          id: session.user?.id || '',
          email: session.user?.email || '',
          name: session.user?.name || '',
          roles: session.user?.roles || [],
          accessToken: '',
          refreshToken: '',
          tokenExpiry: 0,
          backendAccessToken: undefined,
          backendTokenExpiry: undefined,
          preferred_username: session.user?.preferred_username,
          given_name: session.user?.given_name,
          family_name: session.user?.family_name,
          picture: session.user?.picture,
        };
        setUser(baseUser);
        // Fetch the real token once
        initialTokenFetched.current = true;
        fetchAndUpdateToken();
      }
    } else if (status === 'unauthenticated') {
      initialTokenFetched.current = false;
      setUser(null);
    }
    // NOTE: deliberately exclude user/isAuthenticated to avoid re-render loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, status, setLoading, hasRefreshError, setUser]);

  // Periodic token refresh. Checks frequently (every 20s) and refreshes well
  // before expiry, so very short access-token lifespans (e.g. 60-90s configured
  // in Keycloak) don't slip through between checks and cause 401s.
  useEffect(() => {
    if (status !== 'authenticated') return;

    const CHECK_INTERVAL_MS = 20000;   // how often we look at expiry
    const REFRESH_MARGIN_MS = 90000;   // refresh when this close to expiry

    const checkAndRefresh = () => {
      const currentTokenExpiry = useAuthStore.getState().user?.tokenExpiry || 0;
      const timeUntilExpiry = currentTokenExpiry - Date.now();

      // Refresh when near expiry, or if we somehow have no/expired token yet.
      if (currentTokenExpiry === 0 || timeUntilExpiry < REFRESH_MARGIN_MS) {
        console.log('[AuthProvider] Token expiring soon, refreshing...', {
          expiresIn: Math.floor(timeUntilExpiry / 1000) + 's'
        });
        fetchAndUpdateToken();
      }
    };

    // Run once immediately so we don't wait a full interval after mount.
    checkAndRefresh();
    const interval = setInterval(checkAndRefresh, CHECK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [status, fetchAndUpdateToken]);

  // Proactively refresh when the tab regains focus/visibility. Browsers throttle
  // timers in background tabs, so after the user steps away for a few minutes the
  // 20s interval above may not have fired and the access token can be expired on
  // return — causing the next click (e.g. "Plan Journey") to 401. Refreshing here
  // (server-side, token stays in the httpOnly cookie) makes that first action
  // succeed without a re-login. Complements the 401 retry in the request paths.
  useEffect(() => {
    if (status !== 'authenticated') return;
    if (typeof window === 'undefined') return;

    const refreshIfVisible = () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      fetchAndUpdateToken();
    };

    window.addEventListener('focus', refreshIfVisible);
    document.addEventListener('visibilitychange', refreshIfVisible);
    return () => {
      window.removeEventListener('focus', refreshIfVisible);
      document.removeEventListener('visibilitychange', refreshIfVisible);
    };
  }, [status, fetchAndUpdateToken]);

  // Periodic silent session check to detect stale cookies/session drift proactively.
  useEffect(() => {
    if (status !== 'authenticated') return;

    const configured = Number(process.env.NEXT_PUBLIC_SESSION_CHECK_INTERVAL_MS || '3600000');
    const intervalMs = Number.isFinite(configured) && configured > 0 ? configured : 3600000;
    const signOutOnSessionDrift = (process.env.NEXT_PUBLIC_SESSION_CHECK_SIGNOUT_ON_FAILURE || 'false') === 'true';

    const runSessionCheck = async () => {
      if (silentSessionCheckInFlight.current) return;
      silentSessionCheckInFlight.current = true;
      try {
        const res = await fetch('/api/auth/session-check', { cache: 'no-store', credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json().catch(() => ({} as any));
        const isAuthenticated = !!data?.authenticated;
        const hasError = !!data?.error;

        if (!isAuthenticated || hasError) {
          if (!signOutOnSessionDrift) {
            return;
          }
          setUser(null);
          try {
            await signOut({ redirect: false });
          } catch {
            // ignore
          }
          if (typeof window !== 'undefined') {
            const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
            const callbackUrl = window.location.href;
            const qs = new URLSearchParams({ reason: 'expired', callbackUrl });
            window.location.replace(`${basePath}/auth/signin?${qs.toString()}`);
          }
        }
      } catch {
        // ignore transient check failures
      } finally {
        silentSessionCheckInFlight.current = false;
      }
    };

    const interval = setInterval(runSessionCheck, intervalMs);
    return () => clearInterval(interval);
  }, [status, setUser]);

  const login = (callbackUrl?: string) => {
    // Direct provider login: send user to Keycloak and return to a safe in-app URL.
    const fallback = '/admin/default';
    let cb = callbackUrl || fallback;

    if (typeof window !== 'undefined') {
      try {
        const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
        const currentUrl = new URL(window.location.href);

        if (!callbackUrl) {
          const currentPath = currentUrl.pathname;
          cb = currentPath.startsWith(`${basePath}/auth/`) || currentPath.startsWith('/auth/')
            ? `${window.location.origin}${basePath}${fallback}`
            : currentUrl.toString();
        } else {
          const parsed = new URL(callbackUrl, window.location.origin);
          const isSameOrigin = parsed.origin === window.location.origin;
          const isAuthPage = parsed.pathname.startsWith(`${basePath}/auth/`) || parsed.pathname.startsWith('/auth/');
          if (isSameOrigin && !isAuthPage) {
            const adminRootPath = `${basePath}/admin`;
            if (parsed.pathname === '/admin' || parsed.pathname === adminRootPath) {
              cb = `${window.location.origin}${basePath}${fallback}`;
            } else {
              cb = parsed.toString();
            }
          } else {
            cb = `${window.location.origin}${basePath}${fallback}`;
          }
        }
      } catch {
        cb = fallback;
      }
    }

    signIn('keycloak', { callbackUrl: cb, redirect: true }).catch((err) => {
      console.error('Error initiating signIn redirect:', sanitizeForLog(err));
    });
  };

  const logout = async () => {
    // Mark an explicit logout so we don't immediately auto-login again.
    try {
      if (typeof window !== 'undefined') {
        window.localStorage?.setItem('lastLogoutAt', Date.now().toString());
        window.sessionStorage?.setItem('explicitLogout', '1');
      }
    } catch {
      // ignore
    }

    // Clear local auth store immediately so UI updates.
    storeLogout();

    // Perform a single, canonical logout flow via the signout page.
    // That page clears NextAuth cookies then redirects to Keycloak end-session.
    if (typeof window !== 'undefined') {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
      window.location.assign(`${basePath}/auth/signout`);
    }
  };

  const value: AuthContextType = {
    login,
    logout,
    isLoading: status === 'loading',
    user,
    isAuthenticated,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <AuthProviderInner>{children}</AuthProviderInner>
    </SessionProvider>
  );
}
