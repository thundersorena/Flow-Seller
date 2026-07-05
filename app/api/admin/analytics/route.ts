import { NextResponse } from 'next/server';
import { desc, eq, gte, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { executions, users } from '@/src/schema';
import { getCurrentAdmin } from '@/lib/auth/session';

/** Platform-wide analytics for the admin dashboard. */
export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
  }

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [totalsRow] = await db
    .select({
      totalExecutions: sql<number>`count(*)::int`,
      totalTokens:     sql<number>`coalesce(sum(${executions.tokensUsed}), 0)::int`,
      successCount:    sql<number>`count(*) filter (where ${executions.status} = 'success')::int`,
    })
    .from(executions);

  const [userRow] = await db
    .select({ activeUsers: sql<number>`count(*) filter (where ${users.status} = 'active')::int` })
    .from(users);

  const executionsByDay = await db
    .select({
      date:  sql<string>`to_char(${executions.createdAt}, 'Mon DD')`,
      count: sql<number>`count(*)::int`,
    })
    .from(executions)
    .where(gte(executions.createdAt, weekAgo))
    .groupBy(sql`to_char(${executions.createdAt}, 'Mon DD'), date_trunc('day', ${executions.createdAt})`)
    .orderBy(sql`date_trunc('day', ${executions.createdAt})`);

  const tokensByModel = await db
    .select({
      model:  executions.modelName,
      tokens: sql<number>`coalesce(sum(${executions.tokensUsed}), 0)::int`,
    })
    .from(executions)
    .groupBy(executions.modelName)
    .orderBy(desc(sql`sum(${executions.tokensUsed})`));

  const recentExecutions = await db
    .select({
      id:           executions.id,
      workflowName: executions.workflowName,
      modelName:    executions.modelName,
      tokensUsed:   executions.tokensUsed,
      status:       executions.status,
      createdAt:    executions.createdAt,
      userEmail:    users.email,
    })
    .from(executions)
    .leftJoin(users, eq(executions.userId, users.id))
    .orderBy(desc(executions.createdAt))
    .limit(10);

  const totalExecutions = totalsRow?.totalExecutions ?? 0;
  const successRate = totalExecutions
    ? Number((((totalsRow?.successCount ?? 0) / totalExecutions) * 100).toFixed(1))
    : 0;

  return NextResponse.json({
    totalExecutions,
    totalTokens: totalsRow?.totalTokens ?? 0,
    successRate,
    activeUsers: userRow?.activeUsers ?? 0,
    executionsByDay,
    tokensByModel,
    recentExecutions,
  });
}
