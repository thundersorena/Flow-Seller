import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { users } from '@/src/schema';
import { setAuthCookie, toSafeUser } from '@/lib/auth/session';
import { consumeOtp, createOtp } from '@/lib/auth/otp';
import { sendOtpEmail } from '@/lib/email';

const bodySchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  /** 6-digit OTP; omit to request a new code instead. */
  code:  z.string().regex(/^\d{6}$/).optional(),
});

export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }
  const { email, code } = parsed.data;

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) {
    return NextResponse.json({ error: 'No account found for this email.' }, { status: 404 });
  }

  // Resend flow — no code provided.
  if (!code) {
    if (user.emailVerified) {
      return NextResponse.json({ error: 'Email is already verified.' }, { status: 409 });
    }
    const otp = await createOtp(email, 'verify');
    await sendOtpEmail(email, user.name, otp, 'verify');
    return NextResponse.json({ sent: true });
  }

  const valid = await consumeOtp(email, code, 'verify');
  if (!valid) {
    return NextResponse.json({ error: 'Invalid or expired code.' }, { status: 400 });
  }

  const [updated] = await db
    .update(users)
    .set({ emailVerified: true, updatedAt: new Date() })
    .where(eq(users.id, user.id))
    .returning();

  const safe = toSafeUser(updated!);
  await setAuthCookie(safe); // refresh JWT so emailVerified claim is current
  return NextResponse.json({ user: safe });
}
