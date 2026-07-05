import { NextRequest, NextResponse } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { users } from '@/src/schema';
import { getCurrentUser } from '@/lib/auth/session';

/** Price of extra tokens beyond the daily plan limit, in cents per 1K tokens. */
const TOKEN_PACK_PRICE_CENTS_PER_1K = 50;

const bodySchema = z.object({
  /** Amount of bonus tokens to buy, in thousands (1 → 1,000 tokens). */
  packs: z.number().int().min(1).max(1000),
});

/**
 * Buys extra (bonus) tokens spent after the daily plan limit is exhausted.
 * MVP: payment is simulated — plug a PSP in here later.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  }
  if (!user.emailVerified) {
    return NextResponse.json({ error: 'Verify your email before purchasing.' }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid token amount.' }, { status: 400 });
  }

  const tokens = parsed.data.packs * 1000;
  const priceCents = parsed.data.packs * TOKEN_PACK_PRICE_CENTS_PER_1K;

  const [updated] = await db
    .update(users)
    .set({ bonusTokens: sql`${users.bonusTokens} + ${tokens}`, updatedAt: new Date() })
    .where(eq(users.id, user.id))
    .returning();

  return NextResponse.json({ bonusTokens: updated?.bonusTokens ?? 0, tokens, priceCents });
}
