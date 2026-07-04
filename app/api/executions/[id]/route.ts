import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { executions } from '@/src/schema';
import { getCurrentUser } from '@/lib/auth/session';

/** Single execution — visible to its owner or an admin. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  const { id } = await params;

  const [row] = await db.select().from(executions).where(eq(executions.id, id)).limit(1);
  if (!row || (row.userId !== user.id && user.role !== 'admin')) {
    return NextResponse.json({ error: 'Execution not found.' }, { status: 404 });
  }

  return NextResponse.json({ execution: row });
}
