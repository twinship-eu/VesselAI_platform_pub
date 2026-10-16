/**
 * F4-compliant, token-less session refresh.
 *
 * Hitting /api/auth/session runs the NextAuth jwt() callback, which refreshes
 * the Keycloak access token SERVER-SIDE inside the httpOnly session cookie. The
 * browser never receives the access/ID token — the /api/auth/session response
 * deliberately exposes only a liveness hint (`hasAccessToken`) and the expiry
 * (see the session() callback). Callers use the boolean result solely to decide
 * whether to RETRY their same-origin request, so the server-side proxy can
 * inject the freshened bearer from the cookie.
 *
 * Concurrent callers share one in-flight refresh; calls within a short cooldown
 * reuse the last result (so a just-succeeded refresh lets parallel retries
 * proceed instead of being told "not refreshed").
 */

let inFlight: Promise<boolean> | null = null;
let lastResult = false;
let lastAt = 0;
const COOLDOWN_MS = 5000;

export async function refreshSession(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (inFlight) return inFlight;

  const now = Date.now();
  if (now - lastAt < COOLDOWN_MS) return lastResult;

  inFlight = (async () => {
    try {
      const res = await fetch('/api/auth/session', { cache: 'no-store', credentials: 'include' });
      if (!res.ok) {
        lastResult = false;
        return false;
      }
      const data = await res.json().catch(() => ({} as any));
      // A live session has hasAccessToken=true and no refresh error. NOTE: no
      // token is present in this payload — we only read the boolean.
      lastResult = data?.error !== 'RefreshAccessTokenError' && !!data?.hasAccessToken;
      return lastResult;
    } catch {
      lastResult = false;
      return false;
    } finally {
      lastAt = Date.now();
      inFlight = null;
    }
  })();

  return inFlight;
}
