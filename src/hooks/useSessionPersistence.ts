'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useAuthStore } from '../stores';
import { User } from '../types/auth';

export function useSessionPersistence() {
  const { data: session, status } = useSession();
  const { setUser, setLoading, logout } = useAuthStore();

  useEffect(() => {
    setLoading(status === 'loading');

    if (status === 'authenticated' && session) {
      // F4: no token is read from the session — auth is carried by the cookie.
      const userData: User = {
        id: session.user?.id || '',
        email: session.user?.email || '',
        name: session.user?.name || '',
        roles: session.user?.roles || [],
        tokenExpiry: (session as any).accessTokenExpires || 0,
        preferred_username: session.user?.preferred_username,
        given_name: session.user?.given_name,
        family_name: session.user?.family_name,
        picture: session.user?.picture,
      };
      setUser(userData);
    } else if (status === 'unauthenticated') {
      logout();
    }
  }, [session, status, setUser, setLoading, logout]);

  return { session, status };
}
