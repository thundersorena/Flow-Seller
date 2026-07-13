import { NextRequest } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { executions } from '@/src/schema';
import { getServerUser } from '@/lib/auth/actions';
import { engineEnabled, triggerContentFlow } from '@/lib/engine';

const createSchema = z.object({
  prompt:    z.string().min(10, 'Describe your request in at least 10 characters'),
  topic:     z.string().default(''),
  tone:      z.string().default('Professional'),
  length:    z.string().default('Medium'),
  platforms: z.array(z.enum(['telegram', 'bale', 'whatsapp', 'instagram'])).min(1, 'Select at least one platform'),
  mediaType: z.enum(['text', 'image', 'video']).default('text'),
});

export async function GET() {
  const user = await getServerUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const rows = await db
    .select()
    .from(executions)
    .where(eq(executions.userId, user.id))
    .orderBy(desc(executions.createdAt))
    .limit(100);

  return Response.json({ executions: rows });
}

export async function POST(req: NextRequest) {
  const user = await getServerUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
  }
  const input = parsed.data;

  const [row] = await db
    .insert(executions)
    .values({
      userId:       user.id,
      workflowName: 'Social Content Publisher',
      status:       'pending',
      input:        input as Record<string, unknown>,
      prompt:       input.prompt,
      modelName:    'gpt-5.4-mini',
      platforms:    input.platforms,
      mediaType:    input.mediaType,
    })
    .returning();

  if (!row) return Response.json({ error: 'Failed to create execution' }, { status: 500 });

  if (!engineEnabled()) {
    // Dry-run mode: the row stays pending so the UI can be tested before the
    // engine is switched on with CONTENT_ENGINE_ENABLED=true.
    return Response.json({ execution: row, engine: 'disabled' }, { status: 201 });
  }

  const result = await triggerContentFlow({
    executionId: row.id,
    prompt:      input.prompt,
    topic:       input.topic,
    tone:        input.tone,
    length:      input.length,
    platforms:   input.platforms,
    mediaType:   input.mediaType,
  });

  if (!result.ok) {
    const [failed] = await db
      .update(executions)
      .set({ status: 'failed', errorMessage: result.error ?? 'Failed to start automation', updatedAt: new Date() })
      .where(eq(executions.id, row.id))
      .returning();
    return Response.json({ error: 'Failed to start automation', execution: failed }, { status: 502 });
  }

  const [running] = await db
    .update(executions)
    .set({ status: 'running', updatedAt: new Date() })
    .where(eq(executions.id, row.id))
    .returning();

  return Response.json({ execution: running }, { status: 201 });
}
