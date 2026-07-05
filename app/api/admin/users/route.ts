import { NextResponse } from 'next/server';
import { desc, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { executions, plans, users } from '@/src/schema';
import { getCurrentAdmin } from '@/lib/auth/session';

/** All users with plan and lifetime usage aggregates. Admin only. */
export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
  }

  const rows = await db
    .select({
      id:            users.id,
      name:          users.name,
      email:         users.email,
      role:          users.role,
      status:        users.status,
      emailVerified: users.emailVerified,
      bonusTokens:   users.bonusTokens,
      createdAt:     users.createdAt,
      planId:        users.planId,
      planName:      plans.name,
      executions:    sql<number>`count(${executions.id})::int`,
      tokensUsed:    sql<number>`coalesce(sum(${executions.tokensUsed}), 0)::int`,
    })
    .from(users)
    .leftJoin(plans, eq(users.planId, plans.id))
    .leftJoin(executions, eq(executions.userId, users.id))
    .groupBy(users.id, plans.name)
    .orderBy(desc(users.createdAt));

  return NextResponse.json({ users: rows });
}
