import { randomInt } from 'crypto'
import { and, eq, gt } from 'drizzle-orm'
import { db } from '@/lib/db'
import { verificationTokens } from '@/src/schema'

const OTP_EXPIRY_MINUTES = 15
const MAX_OTP_ATTEMPTS = 5

export function generateOTP(): string {
  return randomInt(100000, 999999).toString()
}

export async function sendOTP(email: string, _name: string): Promise<{ error?: string }> {
  const token = generateOTP()
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000)

  await db.delete(verificationTokens).where(eq(verificationTokens.email, email))
  await db.insert(verificationTokens).values({ email, token, expiresAt })

  return {}
}

async function checkOTP(email: string, token: string, consume: boolean): Promise<boolean> {
  const [record] = await db
    .select()
    .from(verificationTokens)
    .where(
      and(
        eq(verificationTokens.email, email),
        gt(verificationTokens.expiresAt, new Date()),
      )
    )
    .limit(1)

  if (!record) return false

  if (record.token !== token) {
    return false
  }

  if (consume) {
    await db.delete(verificationTokens).where(eq(verificationTokens.id, record.id))
  }
  return true
}

/** Validate and consume the OTP (used for email-verification flow). */
export async function verifyOTP(email: string, token: string): Promise<boolean> {
  return checkOTP(email, token, true)
}

/** Validate WITHOUT consuming the OTP (used for forgot-password peek step). */
export async function peekOTP(email: string, token: string): Promise<boolean> {
  return checkOTP(email, token, false)
}
