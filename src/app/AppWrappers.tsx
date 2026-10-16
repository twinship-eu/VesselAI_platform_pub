'use client';
import React, { ReactNode } from 'react';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import ChakraProviders from './ChakraProviders';
import { AuthProvider, AuthContext } from '../providers/AuthProvider';
import { ReactQueryProvider } from '../providers/ReactQueryProvider';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { ChunkLoadErrorHandler } from '../components/ChunkLoadErrorHandler';
import routes from '../routes';
import { getDocumentTitlePrefix } from '../utils/navigation';

const DEV_NOAUTH = process.env.NEXT_PUBLIC_DEV_NOAUTH === 'true';

/**
 * Standalone mock auth provider for local dev without Keycloak.
 * Provides AuthContext directly, completely bypassing SessionProvider/next-auth.
 */
function DevAuthProvider({ children }: { children: ReactNode }) {
  const mockUser = {
    id: 'dev-user',
    email: '',
    name: 'Dev User',
    roles: ['admin'],
    accessToken: '',
    refreshToken: '',
    tokenExpiry: Date.now() + 86400000,
    preferred_username: 'dev',
    given_name: 'Dev',
    family_name: 'User',
  };

  const value = {
    login: () => { },
    logout: () => { },
    isLoading: false,
    user: mockUser,
    isAuthenticated: true,
  };

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export default function AppWrappers({
  children,
  cookieHeader,
}: {
  children: ReactNode;
  cookieHeader?: string;
}) {
  const pathname = usePathname();

  useEffect(() => {
    const titlePrefix = getDocumentTitlePrefix(routes, pathname || '');
    if (typeof document !== 'undefined') {
      document.title = `${titlePrefix} | VesselAI`;
    }
  }, [pathname]);

  return (
    <ChakraProviders cookieHeader={cookieHeader}>
      <ChunkLoadErrorHandler />
      <ReactQueryProvider>
        {DEV_NOAUTH ? (
          <DevAuthProvider>{children}</DevAuthProvider>
        ) : (
          <AuthProvider>
            <ProtectedRoute>{children}</ProtectedRoute>
          </AuthProvider>
        )}
      </ReactQueryProvider>
    </ChakraProviders>
  );
}
