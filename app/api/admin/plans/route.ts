import { NextRequest, NextResponse } from 'next/server';
import { asc, eq, ne } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { plans } from '@/src/schema';
import { getCurrentAdmin } from '@/lib/auth/session';

export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
  }

  const rows = await db.select().from(plans).orderBy(asc(plans.priceCents));
  return NextResponse.json({ plans: rows });
}

const createSchema = z.object({
  slug:            z.string().trim().min(2).regex(/^[a-z0-9-]+$/),
  name:            z.string().trim().min(2),
  description:     z.string().optional(),
  priceCents:      z.number().int().min(0),
  dailyTokenLimit: z.number().int().min(0),
  isDefault:       z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
  }

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid plan data.' }, { status: 400 });
  }

  const [plan] = await db.insert(plans).values({
    ...parsed.data,
    description: parsed.data.description ?? '',
    isDefault:   parsed.data.isDefault ?? false,
  }).returning();

  // Only one plan can be the signup default.
  if (plan && plan.isDefault) {
    await db.update(plans).set({ isDefault: false }).where(ne(plans.id, plan.id));
  }

  return NextResponse.json({ plan }, { status: 201 });
}
