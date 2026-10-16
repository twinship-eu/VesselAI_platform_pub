import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';

/**
 * Server-side access-token resolution for BFF proxy routes (F4).
 *
 * The Keycloak access/ID tokens must never reach the browser. These helpers
 * let server-side route handlers read the access token out of the (httpOnly,
 * possibly chunked) NextAuth JWT cookie and inject it as a Bearer header when
 * proxying to a protected backend — so the browser carries only the session
 * cookie, never a token.
 *
 * This consolidates the cookie-reconstruction logic that previously lived
 * inline in /api/v1/[...path] and /api/auth/token.
 */

function getChunkedCookieValue(req: NextRequest, baseName: string): string | null {
  const direct = req.cookies.get(baseName)?.value;
  if (direct) return direct;
  const parts: string[] = [];
  for (let i = 0; i < 50; i++) {
    const v = req.cookies.get(`${baseName}.${i}`)?.value;
    if (!v) break;
    parts.push(v);
  }
  return parts.length ? parts.join('') : null;
}

function buildReqWithSessionCookie(req: NextRequest, baseName: string, value: string) {
  const headers = new Headers((req as any).headers);
  const kept = req.cookies
    .getAll()
    .filter((c) => c.name !== baseName && !c.name.startsWith(`${baseName}.`))
    .map((c) => `${c.name}=${c.value}`);
  kept.push(`${baseName}=${value}`);
  headers.set('cookie', kept.join('; '));
  return { headers } as any;
}

function detectSessionCookieBaseName(req: NextRequest): { baseName: string; secureCookie: boolean } {
  const names = req.cookies.getAll().map((c) => c.name);
  const secureBase = '__Secure-next-auth.session-token';
  const plainBase = 'next-auth.session-token';
  const has = (base: string) =>
    names.includes(base) || names.some((n) => n === `${base}.0` || n.startsWith(`${base}.`));
  if (has(secureBase)) return { baseName: secureBase, secureCookie: true };
  if (has(plainBase)) return { baseName: plainBase, secureCookie: false };
  const inferred = names.find((n) => n.includes('next-auth.session-token'));
  const baseName = inferred ? inferred.replace(/\.\d+$/, '') : plainBase;
  return { baseName, secureCookie: baseName.startsWith('__Secure-') };
}

/**
 * Resolve the current access token from the request's NextAuth JWT cookie.
 * Returns null if there is no valid session. NEVER expose the return value to
 * the browser — use it only to set an upstream Authorization header.
 */
export async function getAccessTokenFromRequest(req: NextRequest): Promise<string | null> {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) return null;

  let token = await getToken({ req: req as any, secret });
  let accessToken = (token as any)?.accessToken as string | undefined;

  // Fallback runs whenever the access token is missing — including the case
  // where getToken returned a truthy object without an accessToken, which
  // happens with the chunked __Secure-next-auth.session-token.* cookie.
  if (!accessToken) {
    const { baseName, secureCookie } = detectSessionCookieBaseName(req);
    const reconstructed = getChunkedCookieValue(req, baseName);
    token = await getToken({
      req: reconstructed ? buildReqWithSessionCookie(req, baseName, reconstructed) : (req as any),
      secret,
      secureCookie,
      cookieName: baseName,
    });
    accessToken = (token as any)?.accessToken as string | undefined;
  }
  return accessToken || null;
}
