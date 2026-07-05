import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { users } from '@/src/schema'
import { verifyPassword } from '@/lib/auth/password'
import { setAuthCookie } from '@/lib/auth/session'

export async function POST(req: NextRequest) {
  const { email, password } = await req.json() as {
    email?: string
    password?: string
  }

  if (!email || !password) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const normalised = email.toLowerCase().trim()

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, normalised))
    .limit(1)

  // Generic message — don't reveal whether the email exists
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 })
  }

  const { passwordHash: _, ...safe } = user
  await setAuthCookie(safe)

  return NextResponse.json({ user: safe })
}
