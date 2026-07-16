import { NextRequest } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { executions } from '@/src/schema';
import { getServerUser } from '@/lib/auth/session';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getServerUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const condition = user.role === 'admin'
    ? eq(executions.id, id)
    : and(eq(executions.id, id), eq(executions.userId, user.id));

  const [row] = await db.select().from(executions).where(condition).limit(1);
  if (!row) return Response.json({ error: 'Not found' }, { status: 404 });

  return Response.json({ execution: row });
}
