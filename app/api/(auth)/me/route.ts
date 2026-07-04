import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getAllowance } from '@/lib/usage';

/** Current user plus plan/token allowance — the client's session source of truth. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  const allowance = await getAllowance(user);
  return NextResponse.json({ user, allowance });
}
