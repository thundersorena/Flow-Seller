import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { plans, users } from '@/src/schema';
import { hashPassword } from '@/lib/auth/password';
import { setAuthCookie, toSafeUser } from '@/lib/auth/session';
import { createOtp } from '@/lib/auth/otp';
import { sendOtpEmail } from '@/lib/email';

const bodySchema = z.object({
  name:     z.string().trim().min(2),
  email:    z.string().trim().toLowerCase().email(),
  password: z.string().min(8),
});

export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid registration data.' }, { status: 400 });
  }
  const { name, email, password } = parsed.data;

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing) {
    return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });
  }

  const [defaultPlan] = await db.select().from(plans).where(eq(plans.isDefault, true)).limit(1);

  const passwordHash = await hashPassword(password);
  const [newUser] = await db
    .insert(users)
    .values({ name, email, passwordHash, planId: defaultPlan?.id ?? null })
    .returning();

  if (!newUser) {
    return NextResponse.json({ error: 'Failed to create account. Please try again.' }, { status: 500 });
  }

  const code = await createOtp(email, 'verify');
  await sendOtpEmail(email, name, code, 'verify');

  const safe = toSafeUser(newUser);
  await setAuthCookie(safe);
  return NextResponse.json({ user: safe }, { status: 201 });
}
