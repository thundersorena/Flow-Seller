import 'dotenv/config';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { db } from './db';
import { flows, plans, users } from './schema';

/**
 * Idempotent seed: token plans, the sellable n8n flow, and the admin account.
 * Run with: npm run db:seed
 */
async function main() {
  // ── Plans ──────────────────────────────────────────────────────────────────
  const planRows = [
    {
      slug: 'free',
      name: 'Free',
      description: 'Try the platform with a small daily allowance.',
      priceCents: 0,
      dailyTokenLimit: 5_000,
      isDefault: true,
    },
    {
      slug: 'plan-a',
      name: 'Plan A',
      description: 'For regular creators — 5× the free daily allowance.',
      priceCents: 999,
      dailyTokenLimit: 25_000,
      isDefault: false,
    },
    {
      slug: 'plan-b',
      name: 'Plan B',
      description: 'For power users and teams running content daily.',
      priceCents: 2_999,
      dailyTokenLimit: 100_000,
      isDefault: false,
    },
  ];

  for (const plan of planRows) {
    await db.insert(plans).values(plan).onConflictDoNothing({ target: plans.slug });
  }
  console.log(`✅ Plans seeded (${planRows.length})`);

  // ── Flows (files live in N8N_Services/) ───────────────────────────────────
  await db
    .insert(flows)
    .values({
      slug: 'content-creator',
      name: 'Content Creator',
      description:
        'Telegram-driven n8n workflow that generates platform-ready content for Telegram and Instagram with OpenAI — including image and video generation and direct Instagram publishing.',
      category: 'content',
      priceCents: 4_900,
      fileName: 'content_creator.json',
    })
    .onConflictDoNothing({ target: flows.slug });
  console.log('✅ Flow "content-creator" seeded');

  // ── Admin account ──────────────────────────────────────────────────────────
  const adminEmail = (process.env.ADMIN_EMAIL ?? 'admin@flowai.dev').toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'Admin1234!';

  const [existingAdmin] = await db.select({ id: users.id }).from(users).where(eq(users.email, adminEmail)).limit(1);
  if (!existingAdmin) {
    const [defaultPlan] = await db.select().from(plans).where(eq(plans.slug, 'plan-b')).limit(1);
    await db.insert(users).values({
      name: 'Admin',
      email: adminEmail,
      passwordHash: await bcrypt.hash(adminPassword, 12),
      role: 'admin',
      emailVerified: true,
      planId: defaultPlan?.id ?? null,
    });
    console.log(`✅ Admin user created: ${adminEmail}`);
    if (!process.env.ADMIN_PASSWORD) {
      console.log('   ⚠ Using the default password "Admin1234!" — set ADMIN_PASSWORD and reseed for production.');
    }
  } else {
    console.log(`✅ Admin user already exists: ${adminEmail}`);
  }

  console.log('\nSeed complete.');
}

main().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
