import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { flows, purchases } from '@/src/schema';
import { getCurrentUser } from '@/lib/auth/session';

/** Catalog of sellable n8n flows, with ownership state for the current user. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  const [allFlows, owned] = await Promise.all([
    db.select().from(flows).where(eq(flows.isActive, true)),
    db.select({ flowId: purchases.flowId }).from(purchases).where(eq(purchases.userId, user.id)),
  ]);

  const ownedIds = new Set(owned.map((p) => p.flowId));

  return NextResponse.json({
    flows: allFlows.map(({ fileName: _, ...flow }) => ({
      ...flow,
      owned: user.role === 'admin' || ownedIds.has(flow.id),
    })),
  });
}
