import { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { executions } from '@/src/schema';

/**
 * Called by the automation engine when a content run finishes (or fails).
 * Authenticated with the shared secret echoed back in the x-callback-secret header.
 */

const callbackSchema = z.object({
  executionId:      z.string().uuid(),
  status:           z.enum(['success', 'failed']),
  output:           z.string().default(''),
  error:            z.string().default(''),
  modelName:        z.string().default(''),
  promptTokens:     z.coerce.number().int().nonnegative().default(0),
  completionTokens: z.coerce.number().int().nonnegative().default(0),
  tokensUsed:       z.coerce.number().int().nonnegative().default(0),
  n8nExecutionId:   z.coerce.string().default(''),
});

export async function POST(req: NextRequest) {
  const secret = process.env.CONTENT_ENGINE_SECRET;
  if (!secret) return Response.json({ error: 'Callback not configured' }, { status: 500 });

  const provided = req.headers.get('x-callback-secret');
  if (provided !== secret) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = callbackSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? 'Invalid payload' }, { status: 400 });
  }
  const data = parsed.data;

  const [existing] = await db.select().from(executions).where(eq(executions.id, data.executionId)).limit(1);
  if (!existing) return Response.json({ error: 'Execution not found' }, { status: 404 });

  const executionTime = Date.now() - existing.createdAt.getTime();

  const [updated] = await db
    .update(executions)
    .set({
      status:            data.status,
      output:            data.status === 'success' ? data.output : existing.output,
      errorMessage:      data.status === 'failed' ? (data.error || 'Automation failed') : '',
      modelName:         data.modelName || existing.modelName,
      promptTokens:      data.promptTokens,
      completionTokens:  data.completionTokens,
      tokensUsed:        data.tokensUsed || data.promptTokens + data.completionTokens,
      engineExecutionId: data.n8nExecutionId,
      executionTime,
      updatedAt:         new Date(),
    })
    .where(eq(executions.id, data.executionId))
    .returning();

  return Response.json({ ok: true, execution: updated?.id });
}
