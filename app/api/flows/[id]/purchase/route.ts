import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { flows, purchases } from '@/src/schema';
import { getCurrentUser } from '@/lib/auth/session';

/**
 * Purchases a flow for the current user.
 * MVP: payment is simulated — plug a PSP (Stripe, etc.) in here later.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }
  if (!user.emailVerified) {
    return NextResponse.json({ error: 'Verify your email before purchasing.' }, { status: 403 });
  }

  const { id } = await params;

  const [flow] = await db.select().from(flows).where(and(eq(flows.id, id), eq(flows.isActive, true))).limit(1);
  if (!flow) {
    return NextResponse.json({ error: 'Flow not found.' }, { status: 404 });
  }

  const [existing] = await db
    .select({ id: purchases.id })
    .from(purchases)
    .where(and(eq(purchases.userId, user.id), eq(purchases.flowId, flow.id)))
    .limit(1);
  if (existing) {
    return NextResponse.json({ error: 'You already own this flow.' }, { status: 409 });
  }

  const [purchase] = await db
    .insert(purchases)
    .values({ userId: user.id, flowId: flow.id, priceCents: flow.priceCents })
    .returning();

  return NextResponse.json({ purchase }, { status: 201 });
}
