import { NextRequest, NextResponse } from 'next/server';
import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { executions, flows, purchases } from '@/src/schema';
import { getCurrentUser } from '@/lib/auth/session';
import { getAllowance, recordUsage } from '@/lib/usage';
import { createCompletion, OPENAI_MODEL } from '@/lib/openai';

/** List the current user's executions, newest first. */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  const limit = Math.min(Number(req.nextUrl.searchParams.get('limit')) || 50, 200);

  const rows = await db
    .select()
    .from(executions)
    .where(eq(executions.userId, user.id))
    .orderBy(desc(executions.createdAt))
    .limit(limit);

  return NextResponse.json({ executions: rows });
}

const runSchema = z.object({
  flowId:                 z.string().uuid(),
  topic:                  z.string().min(5),
  context:                z.string().min(10),
  tone:                   z.string().min(1),
  length:                 z.enum(['short', 'medium', 'long']),
  additionalInstructions: z.string().optional(),
});

const LENGTH_WORDS = { short: 200, medium: 600, long: 1200 } as const;

/** Runs a purchased flow through OpenAI, enforcing the daily token limit. */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }
  if (!user.emailVerified) {
    return NextResponse.json({ error: 'Verify your email before running automations.' }, { status: 403 });
  }

  const parsed = runSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid automation input.' }, { status: 400 });
  }
  const input = parsed.data;

  // Flow must exist and be owned (admins bypass the lock).
  const [flow] = await db
    .select()
    .from(flows)
    .where(and(eq(flows.id, input.flowId), eq(flows.isActive, true)))
    .limit(1);
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
      return NextResponse.json(
        { error: 'This flow is locked. Purchase it to run automations.' },
        { status: 403 },
      );
    }
  }

  // Daily token limit: plan allowance first, purchased bonus tokens after.
  const allowance = await getAllowance(user);
  if (allowance.remaining <= 0) {
    return NextResponse.json(
      {
        error:     'Daily token limit reached. Upgrade your plan or buy extra tokens to continue.',
        allowance: { dailyLimit: allowance.dailyLimit, usedToday: allowance.usedToday, bonusTokens: allowance.bonusTokens },
      },
      { status: 429 },
    );
  }

  const system =
    'You are FlowAI, a content automation engine modelled after an n8n content-creator workflow. ' +
    'You produce polished, publication-ready content in Markdown.';

  const prompt = [
    `Workflow: ${flow.name}`,
    `Topic: ${input.topic}`,
    `Context: ${input.context}`,
    `Tone: ${input.tone}`,
    `Target length: about ${LENGTH_WORDS[input.length]} words`,
    input.additionalInstructions ? `Additional instructions: ${input.additionalInstructions}` : '',
    '',
    'Generate the content now. Start with a level-2 Markdown heading.',
  ].filter(Boolean).join('\n');

  const started = Date.now();

  try {
    const result = await createCompletion(system, prompt);
    const executionTime = Date.now() - started;

    await recordUsage(user, result.tokensUsed, allowance.dailyLimit);

    const [row] = await db
      .insert(executions)
      .values({
        userId:       user.id,
        flowId:       flow.id,
        workflowName: flow.name,
        status:       'success',
        input:        input as Record<string, unknown>,
        output:       result.content,
        prompt,
        modelName:    result.model,
        tokensUsed:   result.tokensUsed,
        executionTime,
      })
      .returning();

    return NextResponse.json({ execution: row }, { status: 201 });
  } catch (err) {
    const executionTime = Date.now() - started;
    const message = err instanceof Error ? err.message : 'Automation failed.';

    const [row] = await db
      .insert(executions)
      .values({
        userId:       user.id,
        flowId:       flow.id,
        workflowName: flow.name,
        status:       'failed',
        input:        input as Record<string, unknown>,
        output:       message,
        prompt,
        modelName:    OPENAI_MODEL,
        tokensUsed:   0,
        executionTime,
      })
      .returning();

    return NextResponse.json({ error: message, execution: row }, { status: 502 });
  }
}
