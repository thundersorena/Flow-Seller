import { NextRequest, NextResponse } from 'next/server';
import { eq, ne } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { plans } from '@/src/schema';
import { getCurrentAdmin } from '@/lib/auth/session';

const patchSchema = z.object({
  name:            z.string().trim().min(2).optional(),
  description:     z.string().optional(),
  priceCents:      z.number().int().min(0).optional(),
  dailyTokenLimit: z.number().int().min(0).optional(),
  isDefault:       z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
  }

  const { id } = await params;
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid plan update.' }, { status: 400 });
  }

  const [plan] = await db.update(plans).set(parsed.data).where(eq(plans.id, id)).returning();
  if (!plan) {
    return NextResponse.json({ error: 'Plan not found.' }, { status: 404 });
  }

  if (plan.isDefault) {
    await db.update(plans).set({ isDefault: false }).where(ne(plans.id, plan.id));
  }

  return NextResponse.json({ plan });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
  }

  const { id } = await params;
  const [deleted] = await db.delete(plans).where(eq(plans.id, id)).returning({ id: plans.id });
  if (!deleted) {
    return NextResponse.json({ error: 'Plan not found.' }, { status: 404 });
  }

  return NextResponse.json({ deleted: true });
}
