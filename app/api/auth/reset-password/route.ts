import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { users } from '@/src/schema'
import { verifyOTP } from '@/lib/auth/otp'
import { hashPassword } from '@/lib/auth/password'

export async function POST(req: NextRequest) {
  const { email, code, newPassword } = await req.json() as {
    email?: string
    code?: string
    newPassword?: string
  }

  if (!email || !code || !newPassword) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
    return NextResponse.json(
      { error: 'Password must be at least 8 characters and contain an uppercase letter and a number' },
      { status: 400 }
    )
  }

  const normalised = email.toLowerCase().trim()

  const valid = await verifyOTP(normalised, code)
  if (!valid) {
    return NextResponse.json({ error: 'Incorrect or expired code' }, { status: 400 })
  }

  const passwordHash = await hashPassword(newPassword)
  const [updated] = await db
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.email, normalised))
    .returning({ id: users.id })

  if (!updated) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
