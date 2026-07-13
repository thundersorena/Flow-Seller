import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { users } from '@/src/schema'
import { hashPassword } from '@/lib/auth/password'
import { setAuthCookie } from '@/lib/auth/session'
import { sendOTP } from '@/lib/auth/otp'

export async function POST(req: NextRequest) {
  const { name, email, password } = await req.json() as {
    name?: string
    email?: string
    password?: string
  }

  if (!name || !email || !password) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  const normalised = email.toLowerCase().trim()

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, normalised))
    .limit(1)

  if (existing) {
    return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 })
  }

  const passwordHash = await hashPassword(password)
  const [newUser] = await db
    .insert(users)
    .values({ name: name.trim(), email: normalised, passwordHash })
    .returning()

  if (!newUser) {
    return NextResponse.json({ error: 'Failed to create account. Please try again.' }, { status: 500 })
  }

  const { passwordHash: _, ...safe } = newUser
  await setAuthCookie(safe)

  // Fire OTP — non-fatal: user can resend from verify-email page
  const { error: otpError } = await sendOTP(normalised, safe.name)

  return NextResponse.json({ user: safe, ...(otpError ? { otpError } : {}) })
}
