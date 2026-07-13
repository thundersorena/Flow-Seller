import { desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { executions, users } from '@/src/schema';
import { getServerUser } from '@/lib/auth/actions';

/** Admin only: every execution across all users, with owner name/email attached. */
export async function GET() {
  const user = await getServerUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

  const rows = await db
    .select({
      execution: executions,
      userName:  users.name,
      userEmail: users.email,
    })
    .from(executions)
    .innerJoin(users, eq(executions.userId, users.id))
    .orderBy(desc(executions.createdAt))
    .limit(500);

  return Response.json({
    executions: rows.map((r) => ({ ...r.execution, userName: r.userName, userEmail: r.userEmail })),
  });
}
