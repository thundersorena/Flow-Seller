import { NextRequest, NextResponse } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { users } from '@/src/schema';
import { getCurrentAdmin, toSafeUser } from '@/lib/auth/session';

const patchSchema = z.object({
  /** Assign a token plan (null clears it). */
  planId:      z.string().uuid().nullable().optional(),
  /** Grant (positive) or revoke (negative) bonus tokens. */
  grantTokens: z.number().int().optional(),
  status:      z.enum(['active', 'suspended']).optional(),
  role:        z.enum(['user', 'admin']).optional(),
});

/** Admin management of a single user: plan, token grants, suspension, role. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
  }

  const { id } = await params;
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid update.' }, { status: 400 });
  }
  const { planId, grantTokens, status, role } = parsed.data;

  if (id === admin.id && (status === 'suspended' || role === 'user')) {
    return NextResponse.json({ error: 'You cannot demote or suspend your own account.' }, { status: 400 });
  }

  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (planId !== undefined) set.planId = planId;
  if (status !== undefined) set.status = status;
  if (role   !== undefined) set.role = role;
  if (grantTokens !== undefined) {
    set.bonusTokens = sql`GREATEST(${users.bonusTokens} + ${grantTokens}, 0)`;
  }

  const [updated] = await db.update(users).set(set).where(eq(users.id, id)).returning();
  if (!updated) {
    return NextResponse.json({ error: 'User not found.' }, { status: 404 });
  }

  return NextResponse.json({ user: toSafeUser(updated) });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
  }

  const { id } = await params;
  if (id === admin.id) {
    return NextResponse.json({ error: 'You cannot delete your own account.' }, { status: 400 });
  }

  const [deleted] = await db.delete(users).where(eq(users.id, id)).returning({ id: users.id });
  if (!deleted) {
    return NextResponse.json({ error: 'User not found.' }, { status: 404 });
  }

  return NextResponse.json({ deleted: true });
}
