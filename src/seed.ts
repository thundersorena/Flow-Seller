import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { users } from './schema';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
const db = drizzle(pool);


if (!process.env.SEED_ADMIN_PASSWORD) throw new Error('SEED_ADMIN_PASSWORD is not set');

const ADMIN = {
  name:     'Admin',
  email:    process.env.SEED_ADMIN_EMAIL ?? 'admin@flowai.dev',
  password: process.env.SEED_ADMIN_PASSWORD,
  role:     'admin' as const,
};

async function seed() {
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, ADMIN.email))
    .limit(1);

  if (existing) {
    console.log(`Admin already exists (id: ${existing.id}). Skipping.`);
    await pool.end();
    return;
  }

  const passwordHash = await bcrypt.hash(ADMIN.password, 12);

  const [admin] = await db
    .insert(users)
    .values({
      name:          ADMIN.name,
      email:         ADMIN.email,
      passwordHash,
      role:          ADMIN.role,
      emailVerified: true,
    })
    .returning();

  console.log('✅ Admin user created:');
  console.log(`   id:    ${admin!.id}`);
  console.log(`   email: ${admin!.email}`);
  console.log(`   role:  ${admin!.role}`);
  console.log(`   pass:  ${ADMIN.password}  ← change in production`);

  await pool.end();
}

seed().catch(async e => {
  console.error('Seed failed:', e instanceof Error ? e.message : e);
  await pool.end();
  process.exit(1);
});
