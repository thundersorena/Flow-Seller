import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { users } from '@/src/schema'
import { verifyOTP, peekOTP } from '@/lib/auth/otp'
import { getServerUser, setAuthCookie } from '@/lib/auth/session'

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    code?: string
    mode?: 'verify-email' | 'forgot-password'
    email?: string
  }

  if (!body.code || body.code.length !== 6) {
    return NextResponse.json({ error: 'Invalid code' }, { status: 400 })
  }

  const mode = body.mode ?? 'verify-email'

  // ── forgot-password: peek (validate without consuming) ───────────────────
  if (mode === 'forgot-password') {
    if (!body.email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }
    const email = body.email.toLowerCase().trim()
    const valid = await peekOTP(email, body.code)
    if (!valid) {
      return NextResponse.json({ error: 'Incorrect or expired code' }, { status: 400 })
    }
    return NextResponse.json({ success: true })
  }

  // ── verify-email: consume + mark verified + refresh JWT ──────────────────
  const sessionUser = await getServerUser()
  if (!sessionUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const valid = await verifyOTP(sessionUser.email, body.code)
  if (!valid) {
    return NextResponse.json({ error: 'Incorrect or expired code' }, { status: 400 })
  }

  const [updated] = await db
    .update(users)
    .set({ emailVerified: true, updatedAt: new Date() })
    .where(eq(users.email, sessionUser.email))
    .returning()

  if (!updated) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { passwordHash: _, ...safe } = updated
  await setAuthCookie(safe)

  return NextResponse.json({ success: true })
}
