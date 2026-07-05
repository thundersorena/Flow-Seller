import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { users } from '@/src/schema'
import { sendOTP } from '@/lib/auth/otp'

export async function POST(req: NextRequest) {
 let email: string | undefined
   try { 
    ({ email } = (await req.json()) as { email?: string })
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  
  if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  
  const normalised = email.toLowerCase().trim()

  // Look up user — but always return success to prevent email enumeration
  const [user] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.email, normalised))
    .limit(1)

  if (user) {
    await sendOTP(normalised, user.name)
  }

  return NextResponse.json({ success: true })
}
