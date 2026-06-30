'use server';

import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users } from '@/src/schema';
import type { SafeUser } from '@/src/schema';
import { hashPassword, verifyPassword } from './password';
import { setAuthCookie, deleteAuthCookie } from './session';
import { sendOTP } from './otp';

function toSafeUser(u: typeof users.$inferSelect): SafeUser {
  const { passwordHash: _, ...safe } = u;
  return safe;
}

export async function registerAction(formData: FormData) {
  const name     = (formData.get('name')     as string).trim();
  const email    = (formData.get('email')    as string).toLowerCase().trim();
  const password =  formData.get('password') as string;

  try {
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing) return { error: 'An account with this email already exists.' };

    const passwordHash = await hashPassword(password);
    const [newUser]    = await db
      .insert(users)
      .values({ name, email, passwordHash })
      .returning();

    if (!newUser) return { error: 'Failed to create account. Please try again.' };

    const safe = toSafeUser(newUser);
    await setAuthCookie(safe);

    const { error: otpError } = await sendOTP(safe.email, safe.name);
    if (otpError) return { user: safe, otpError };

    return { user: safe };
  } catch (e) {
    const cause = e instanceof Error ? ((e as { cause?: Error }).cause?.message ?? '') : '';
    const msg   = e instanceof Error ? e.message : String(e);
    console.error('[registerAction]', msg, cause);
    return { error: cause || msg };
  }
}

export async function loginAction(formData: FormData) {
  const email    = (formData.get('email')    as string).toLowerCase().trim();
  const password =  formData.get('password') as string;

  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return { error: 'Invalid email or password.' };
    }

    const safe = toSafeUser(user);
    await setAuthCookie(safe);
    return { user: safe };
  } catch (e) {
    const cause = e instanceof Error ? ((e as { cause?: Error }).cause?.message ?? '') : '';
    const msg   = e instanceof Error ? e.message : String(e);
    console.error('[loginAction]', msg, cause);
    return { error: cause || msg };
  }
}

export async function logoutAction() {
  await deleteAuthCookie();
  redirect('/login');
}
