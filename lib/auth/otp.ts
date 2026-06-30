import { randomInt } from 'crypto'
import { eq, and, gt } from 'drizzle-orm'
import { Resend } from 'resend'
import { render } from '@react-email/render'
import { db } from '@/lib/db'
import { verificationTokens } from '@/src/schema'
import { OTPEmail } from '@/components/emails/otp-email'

const OTP_EXPIRY_MINUTES = 15

export function generateOTP(): string {
  return randomInt(100000, 999999).toString()
}

export async function sendOTP(email: string, name: string): Promise<{ error?: string }> {
  const token     = generateOTP()
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000)

  await db.delete(verificationTokens).where(eq(verificationTokens.email, email))
  await db.insert(verificationTokens).values({ email, token, expiresAt })

  const html = await render(OTPEmail({ name, code: token }))

  const resend = new Resend(process.env.RESEND_API_KEY)
  const { error } = await resend.emails.send({
    from:    'FlowAI <onboarding@resend.dev>',
    to:      [email],
    subject: `${token} is your FlowAI verification code`,
    html,
  })

  if (error) return { error: error.message }
  return {}
}

async function findOTPRecord(email: string, token: string) {
  const [record] = await db
    .select()
    .from(verificationTokens)
    .where(
      and(
        eq(verificationTokens.email, email),
        eq(verificationTokens.token, token),
        gt(verificationTokens.expiresAt, new Date()),
      )
    )
    .limit(1)
  return record ?? null
}

/** Validate and consume the OTP (used for email-verification flow). */
export async function verifyOTP(email: string, token: string): Promise<boolean> {
  const record = await findOTPRecord(email, token)
  if (!record) return false
  await db.delete(verificationTokens).where(eq(verificationTokens.id, record.id))
  return true
}

/** Validate WITHOUT consuming the OTP (used for forgot-password peek step). */
export async function peekOTP(email: string, token: string): Promise<boolean> {
  return (await findOTPRecord(email, token)) !== null
}
