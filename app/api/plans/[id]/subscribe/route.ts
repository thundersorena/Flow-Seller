import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { plans, users } from '@/src/schema';
import { getCurrentUser } from '@/lib/auth/session';

/**
 * Switches the current user to a plan.
 * MVP: payment is simulated — plug a PSP in here later.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }
  if (!user.emailVerified) {
    return NextResponse.json({ error: 'Verify your email before subscribing.' }, { status: 403 });
  }

  const { id } = await params;

  const [plan] = await db.select().from(plans).where(eq(plans.id, id)).limit(1);
  if (!plan) {
    return NextResponse.json({ error: 'Plan not found.' }, { status: 404 });
  }

  await db.update(users).set({ planId: plan.id, updatedAt: new Date() }).where(eq(users.id, user.id));

  return NextResponse.json({ plan });
}
