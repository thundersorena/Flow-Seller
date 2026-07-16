import { count, desc, eq, sql, sum } from 'drizzle-orm';
import { db } from '@/lib/db';
import { executions, users } from '@/src/schema';
import { getServerUser } from '@/lib/auth/session';

/** Admin only: aggregate usage for the monitoring dashboard. */
export async function GET() {
  const user = await getServerUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

  const [totals] = await db
    .select({
      totalExecutions:      count(),
      totalTokens:          sum(executions.tokensUsed),
      totalPromptTokens:    sum(executions.promptTokens),
      totalCompletionTokens: sum(executions.completionTokens),
    })
    .from(executions);

  const byStatus = await db
    .select({ status: executions.status, count: count() })
    .from(executions)
    .groupBy(executions.status);

  const byUser = await db
    .select({
      userId:      executions.userId,
      userName:    users.name,
      userEmail:   users.email,
      executions:  count(),
      tokensUsed:  sum(executions.tokensUsed),
    })
    .from(executions)
    .innerJoin(users, eq(executions.userId, users.id))
    .groupBy(executions.userId, users.name, users.email)
    .orderBy(desc(sum(executions.tokensUsed)));

  const byDay = await db
    .select({
      day:        sql<string>`to_char(${executions.createdAt}, 'YYYY-MM-DD')`,
      executions: count(),
      tokensUsed: sum(executions.tokensUsed),
    })
    .from(executions)
    .where(sql`${executions.createdAt} > now() - interval '30 days'`)
    .groupBy(sql`to_char(${executions.createdAt}, 'YYYY-MM-DD')`)
    .orderBy(sql`to_char(${executions.createdAt}, 'YYYY-MM-DD')`);

  return Response.json({
    totals: {
      totalExecutions:       Number(totals?.totalExecutions ?? 0),
      totalTokens:           Number(totals?.totalTokens ?? 0),
      totalPromptTokens:     Number(totals?.totalPromptTokens ?? 0),
      totalCompletionTokens: Number(totals?.totalCompletionTokens ?? 0),
    },
    byStatus: byStatus.map((s) => ({ status: s.status, count: Number(s.count) })),
    byUser:   byUser.map((u) => ({ ...u, executions: Number(u.executions), tokensUsed: Number(u.tokensUsed ?? 0) })),
    byDay:    byDay.map((d) => ({ ...d, executions: Number(d.executions), tokensUsed: Number(d.tokensUsed ?? 0) })),
  });
}
