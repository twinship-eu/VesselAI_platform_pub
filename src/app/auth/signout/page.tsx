'use client';

import { useEffect } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { sanitizeForLog } from '../../../lib/sanitizeLog.js';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../../stores';
import {
  Box,
  Center,
  VStack,
  Text,
  useColorModeValue,
} from '@chakra-ui/react';
import SpeedboatLoader from 'components/loaders/SpeedboatLoader';

export default function SignOutPage() {
  const router = useRouter();
  const { logout: storeLogout } = useAuthStore();
  const { data: session } = useSession();
  const bg = useColorModeValue('gray.50', 'gray.900');

  useEffect(() => {
    const performLogout = async () => {
      try {
        // Mark explicit logout so sign-in page doesn't auto-trigger SSO.
        try {
          if (typeof window !== 'undefined') {
            window.sessionStorage?.setItem('explicitLogout', '1');
            window.localStorage?.setItem('lastLogoutAt', Date.now().toString());
          }
        } catch {
          // ignore
        }

        // Clear local store
        storeLogout();

        // Best-effort: stop the user's running JupyterHub server so their stale
        // Keycloak tokens (in the container env) die with the container.
        try {
          const username = (
            (session as any)?.user?.preferred_username ||
            (session as any)?.user?.name ||
            ''
          )
            .toString()
            .toLowerCase();
          if (username) {
            await fetch('/api/jupyterhub/stop-server', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ username }),
              signal: AbortSignal.timeout(2000),
            });
          }
        } catch {
          // best-effort; don't block signout
        }

        // Clear JupyterHub browser cookies so the next platform user doesn't inherit
        // the previous user's hub session (JupyterHub is a separate OIDC client with
        // its own cookies that Keycloak end-session does not touch).
        const hubUrl = process.env.NEXT_PUBLIC_JUPYTERHUB_URL;
        if (hubUrl) {
          await new Promise<void>((resolve) => {
            let done = false;
            const finish = () => { if (!done) { done = true; resolve(); } };
            const img = new Image();
            img.onload = img.onerror = finish;
            img.src = `${hubUrl.replace(/\/$/, '')}/hub/logout?_=${Date.now()}`;
            setTimeout(finish, 1500);
          });
          try { window.localStorage?.removeItem('lastHubUser'); } catch { /* ignore */ }
        }

        // F4: the id_token_hint must NOT be read from the browser session. Ask
        // the server to build the Keycloak logout URL — it reads the idToken
        // from the httpOnly JWT cookie and returns the assembled URL.
        const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
        const postLogout = `${window.location.origin}${basePath}/auth/signin`;
        let keycloakLogoutUrl = postLogout;
        try {
          const res = await fetch(
            `/api/auth/logout-url?post_logout_redirect_uri=${encodeURIComponent(postLogout)}`,
            { cache: 'no-store', credentials: 'include' }
          );
          if (res.ok) {
            const data = await res.json().catch(() => ({} as any));
            if (data?.url) keycloakLogoutUrl = data.url as string;
          }
        } catch {
          // fall back to the plain sign-in redirect below
        }

        // Chain Dagster's oauth2-proxy sign_out before Keycloak, so its cookie is
        // cleared by a top-level navigation (image-beacon clears are blocked by
        // SameSite=Lax / third-party-cookie restrictions). oauth2-proxy-dagster
        // must whitelist the Keycloak host for the `rd` redirect to be honoured.
        const dagsterUrl = process.env.NEXT_PUBLIC_DAGSTER_URL;
        const finalCallback = dagsterUrl
          ? `${dagsterUrl.replace(/\/$/, '')}/oauth2/sign_out?rd=${encodeURIComponent(
              keycloakLogoutUrl
            )}`
          : keycloakLogoutUrl;

        // Clear NextAuth cookies and kick off the redirect chain.
        await signOut({ callbackUrl: finalCallback, redirect: true });
      } catch (error) {
        // Avoid printing raw error objects which may contain tokens or secrets
        console.error('Logout error:', sanitizeForLog(error));
        // Fallback: redirect to home even on error
        router.push('/auth/signin');
      }
    };

    performLogout();
  }, [router, storeLogout, session]);

  return (
    <Box minH="100vh" bg={bg} display="flex" alignItems="center" justifyContent="center">
      <Center h="100vh">
        <VStack spacing={4}>
          <SpeedboatLoader size={80} />
          <Text>Signing out...</Text>
        </VStack>
      </Center>
    </Box>
  );
}
