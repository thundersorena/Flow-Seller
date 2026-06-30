import { NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth/session'
import { sendOTP } from '@/lib/auth/otp'

export async function POST() {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await sendOTP(user.email, user.name)
  if (error) return NextResponse.json({ error }, { status: 500 })

  return NextResponse.json({ success: true })
}
