import { NextResponse } from 'next/server';
import { asc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { plans } from '@/src/schema';

/** Public list of token plans (Plan A, Plan B, …). */
export async function GET() {
  const allPlans = await db.select().from(plans).orderBy(asc(plans.priceCents));
  return NextResponse.json({ plans: allPlans });
}
