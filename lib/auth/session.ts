import { cookies } from 'next/headers';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users } from '@/src/schema';
import type { SafeUser, User } from '@/src/schema';
import { signToken, verifyToken, type JWTPayload } from './jwt';

export const AUTH_COOKIE = 'flowai_token';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path:     '/',
  maxAge:   60 * 60 * 24 * 30, // 30 days in seconds
};

export function toSafeUser(user: User): SafeUser {
  const { passwordHash: _, ...safe } = user;
  return safe;
}

export async function setAuthCookie(user: SafeUser): Promise<void> {
  const token = await signToken(user);
  const jar   = await cookies();
  jar.set(AUTH_COOKIE, token, COOKIE_OPTIONS);
}

export async function clearAuthCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(AUTH_COOKIE);
}

/** JWT claims from the auth cookie, or null when not authenticated. */
export async function getSessionPayload(): Promise<JWTPayload | null> {
  const jar   = await cookies();
  const token = jar.get(AUTH_COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token);
}

/** Lightweight user info straight from the JWT (no DB round-trip). */
export async function getServerUser() {
  const payload = await getSessionPayload();
  if (!payload) return null;

  return {
    id:            payload.sub,
    name:          payload.name,
    email:         payload.email,
    role:          payload.role,
    emailVerified: payload.emailVerified,
  };
}

/**
 * Authoritative current user loaded from the database (plan, tokens and
 * status may change after the JWT was issued). Null when not authenticated,
 * unknown, or suspended.
 */
export async function getCurrentUser(): Promise<SafeUser | null> {
  const payload = await getSessionPayload();
  if (!payload) return null;

  const [user] = await db.select().from(users).where(eq(users.id, payload.sub)).limit(1);
  if (!user || user.status === 'suspended') return null;

  return toSafeUser(user);
}

export async function getCurrentAdmin(): Promise<SafeUser | null> {
  const user = await getCurrentUser();
  return user?.role === 'admin' ? user : null;
}
