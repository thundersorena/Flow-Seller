import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { users } from '@/src/schema';
import { hashPassword } from '@/lib/auth/password';
import { consumeOtp, createOtp } from '@/lib/auth/otp';
import { sendOtpEmail } from '@/lib/email';

const requestSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

/** Step 1 — request a reset code. Always responds 200 to avoid email enumeration. */
export async function POST(req: NextRequest) {
  const parsed = requestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Enter a valid email.' }, { status: 400 });
  }
  const { email } = parsed.data;

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (user) {
    const code = await createOtp(email, 'reset');
    await sendOtpEmail(email, user.name, code, 'reset');
  }

  return NextResponse.json({ sent: true });
}

const resetSchema = z.object({
  email:       z.string().trim().toLowerCase().email(),
  code:        z.string().regex(/^\d{6}$/),
  newPassword: z.string().min(8),
});

/** Step 2 — reset the password with the emailed code. */
export async function PUT(req: NextRequest) {
  const parsed = resetSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid reset data.' }, { status: 400 });
  }
  const { email, code, newPassword } = parsed.data;

  const valid = await consumeOtp(email, code, 'reset');
  if (!valid) {
    return NextResponse.json({ error: 'Invalid or expired code.' }, { status: 400 });
  }

  const passwordHash = await hashPassword(newPassword);
  await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.email, email));

  return NextResponse.json({ reset: true });
}
