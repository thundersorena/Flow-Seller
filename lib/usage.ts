import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { dailyUsage, plans, users } from '@/src/schema';
import type { Plan, SafeUser } from '@/src/schema';

/** Daily token limit applied to users without a plan. */
export const FALLBACK_DAILY_LIMIT = 2_000;

/** Calendar day in YYYY-MM-DD (UTC) — daily limits reset at midnight UTC. */
export function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export interface Allowance {
  plan:        Plan | null;
  dailyLimit:  number;
  usedToday:   number;
  bonusTokens: number;
  /** Tokens still spendable today (plan remainder + bonus balance). */
  remaining:   number;
}

export async function getAllowance(user: SafeUser): Promise<Allowance> {
  let plan: Plan | null = null;
  if (user.planId) {
    const [row] = await db.select().from(plans).where(eq(plans.id, user.planId)).limit(1);
    plan = row ?? null;
  }

  const dailyLimit = plan?.dailyTokenLimit ?? FALLBACK_DAILY_LIMIT;

  const [usage] = await db
    .select()
    .from(dailyUsage)
    .where(and(eq(dailyUsage.userId, user.id), eq(dailyUsage.day, todayKey())))
    .limit(1);

  const usedToday = usage?.tokensUsed ?? 0;
  const remaining = Math.max(0, dailyLimit - usedToday) + user.bonusTokens;

  return { plan, dailyLimit, usedToday, bonusTokens: user.bonusTokens, remaining };
}

/**
 * Records token consumption. Tokens beyond the daily plan limit are deducted
 * from the user's purchased bonus balance.
 */
export async function recordUsage(user: SafeUser, tokens: number, dailyLimit: number): Promise<void> {
  if (tokens <= 0) return;

  const [row] = await db
    .insert(dailyUsage)
    .values({ userId: user.id, day: todayKey(), tokensUsed: tokens })
    .onConflictDoUpdate({
      target: [dailyUsage.userId, dailyUsage.day],
      set: {
        tokensUsed: sql`${dailyUsage.tokensUsed} + ${tokens}`,
        updatedAt:  new Date(),
      },
    })
    .returning();

  const totalToday = row?.tokensUsed ?? tokens;
  const overflow   = Math.min(tokens, Math.max(0, totalToday - dailyLimit));

  if (overflow > 0) {
    await db
      .update(users)
      .set({ bonusTokens: sql`GREATEST(${users.bonusTokens} - ${overflow}, 0)`, updatedAt: new Date() })
      .where(eq(users.id, user.id));
  }
}
