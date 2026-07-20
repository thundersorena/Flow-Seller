'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users } from '@/src/schema';
import type { SafeUser } from '@/src/schema';
import { hashPassword, verifyPassword } from './password';
import { signToken, verifyToken } from './jwt';
import { getAuthConfigError } from './config';

const AUTH_COOKIE = 'flowai_token';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path:     '/',
  maxAge:   60 * 60 * 24 * 30, // 30 days in seconds
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toSafeUser(user: typeof users.$inferSelect): SafeUser {
  const { passwordHash: _, ...safe } = user;
  return safe;
}

async function setAuthCookie(user: SafeUser) {
  const token = await signToken(user);
  const jar   = await cookies();
  jar.set(AUTH_COOKIE, token, COOKIE_OPTIONS);
}

// ─── Actions ──────────────────────────────────────────────────────────────────

export async function registerAction(formData: FormData) {
  const authConfigError = getAuthConfigError();
  if (authConfigError) {
    return { error: authConfigError };
  }

  const name     = (formData.get('name')     as string).trim();
  const email    = (formData.get('email')    as string).toLowerCase().trim();
  const password =  formData.get('password') as string;

  try {
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existing) return { error: 'An account with this email already exists.' };

    const passwordHash = await hashPassword(password);

    const [newUser] = await db
      .insert(users)
      .values({ name, email, passwordHash })
      .returning();

    if (!newUser) return { error: 'Failed to create account. Please try again.' };

    const safe = toSafeUser(newUser);
    await setAuthCookie(safe);
    return { user: safe };
  } catch (error) {
    console.error('registerAction failed', error);
    return { error: 'Unable to create account right now. Please try again later.' };
  }
}

export async function loginAction(formData: FormData) {
  const authConfigError = getAuthConfigError();
  if (authConfigError) {
    return { error: authConfigError };
  }

  const email    = (formData.get('email')    as string).toLowerCase().trim();
  const password =  formData.get('password') as string;

  try {
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return { error: 'Invalid email or password.' };
    }

    const safe = toSafeUser(user);
    await setAuthCookie(safe);
    return { user: safe };
  } catch (error) {
    console.error('loginAction failed', error);
    return { error: 'Unable to sign in right now. Please try again later.' };
  }
}

export async function logoutAction() {
  const jar = await cookies();
  jar.delete(AUTH_COOKIE);
  redirect('/login');
}

/**
 * Returns the authenticated user from the JWT cookie.
 * Call this in Server Components and Route Handlers.
 */
export async function getServerUser() {
  const jar   = await cookies();
  const token = jar.get(AUTH_COOKIE)?.value;
  if (!token) return null;

  try {
    const payload = await verifyToken(token);
    if (!payload) return null;

    return {
      id:            payload.sub,
      name:          payload.name,
      email:         payload.email,
      role:          payload.role,
      emailVerified: payload.emailVerified,
    };
  } catch (error) {
    console.error('getServerUser failed', error);
    return null;
  }
}
