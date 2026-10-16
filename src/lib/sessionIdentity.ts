import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';

export interface SessionIdentity {
  username: string;
  roles: string[];
}

export async function getSessionIdentity(req: NextRequest): Promise<SessionIdentity | null> {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) return null;
  const token = await getToken({ req: req as any, secret });
  if (!token) return null;
  const username = ((token as any).preferred_username || (token as any).name || '')
    .toString()
    .trim()
    .toLowerCase();
  const roles = Array.isArray((token as any).roles) ? ((token as any).roles as string[]) : [];
  if (!username) return null;
  return { username, roles };
}
