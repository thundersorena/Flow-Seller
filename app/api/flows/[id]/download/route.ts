import { promises as fs } from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { flows, purchases } from '@/src/schema';
import { getCurrentUser } from '@/lib/auth/session';

const FLOWS_DIR = path.join(process.cwd(), 'N8N_Services');

/** Streams the purchased n8n workflow JSON. Locked until the user owns the flow. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  const { id } = await params;

  const [flow] = await db.select().from(flows).where(eq(flows.id, id)).limit(1);
  if (!flow) {
    return NextResponse.json({ error: 'Flow not found.' }, { status: 404 });
  }

  if (user.role !== 'admin') {
    const [owned] = await db
      .select({ id: purchases.id })
      .from(purchases)
      .where(and(eq(purchases.userId, user.id), eq(purchases.flowId, flow.id)))
      .limit(1);
    if (!owned) {
      return NextResponse.json({ error: 'Purchase this flow to download it.' }, { status: 403 });
    }
  }

  // Serve only files inside N8N_Services — never a caller-influenced path.
  const filePath = path.join(FLOWS_DIR, path.basename(flow.fileName));
  let content: string;
  try {
    content = await fs.readFile(filePath, 'utf-8');
  } catch {
    return NextResponse.json({ error: 'Flow file is missing on the server.' }, { status: 500 });
  }

  return new NextResponse(content, {
    headers: {
      'Content-Type':        'application/json',
      'Content-Disposition': `attachment; filename="${flow.slug}.json"`,
    },
  });
}
