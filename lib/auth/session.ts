import { cookies } from 'next/headers';
import type { SafeUser } from '@/src/schema';
import { signToken, verifyToken } from './jwt';

export const AUTH_COOKIE = 'flowai_token';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path:     '/',
  maxAge:   60 * 60 * 24 * 30,
};

export async function setAuthCookie(user: SafeUser) {
  const token = await signToken(user);
  const jar   = await cookies();
  jar.set(AUTH_COOKIE, token, COOKIE_OPTIONS);
}

export async function deleteAuthCookie() {
  const jar = await cookies();
  jar.delete(AUTH_COOKIE);
}

export async function getServerUser() {
  const jar   = await cookies();
  const token = jar.get(AUTH_COOKIE)?.value;
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  return {
    id:            payload.sub,
    name:          payload.name,
    email:         payload.email,
    role:          payload.role,
    emailVerified: payload.emailVerified,
  };
}
