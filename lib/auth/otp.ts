import { and, eq, lt } from 'drizzle-orm';
import { db } from '@/lib/db';
import { verificationTokens } from '@/src/schema';

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes

export type OtpPurpose = 'verify' | 'reset';

/** Creates a fresh 6-digit OTP for the email, replacing any previous one. */
export async function createOtp(email: string, purpose: OtpPurpose): Promise<string> {
  const code = String(Math.floor(100000 + Math.random() * 900000));

  await db.delete(verificationTokens).where(
    and(eq(verificationTokens.email, email), eq(verificationTokens.purpose, purpose)),
  );

  await db.insert(verificationTokens).values({
    email,
    token:     code,
    purpose,
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
  });

  return code;
}

/** Validates and consumes an OTP. Returns true when the code matched. */
export async function consumeOtp(email: string, code: string, purpose: OtpPurpose): Promise<boolean> {
  // Opportunistic cleanup of expired codes.
  await db.delete(verificationTokens).where(lt(verificationTokens.expiresAt, new Date()));

  const [row] = await db
    .select()
    .from(verificationTokens)
    .where(
      and(
        eq(verificationTokens.email, email),
        eq(verificationTokens.token, code),
        eq(verificationTokens.purpose, purpose),
      ),
    )
    .limit(1);

  if (!row || row.expiresAt.getTime() < Date.now()) return false;

  await db.delete(verificationTokens).where(eq(verificationTokens.id, row.id));
  return true;
}
