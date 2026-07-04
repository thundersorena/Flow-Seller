import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { users } from '@/src/schema';
import { verifyPassword } from '@/lib/auth/password';
import { setAuthCookie, toSafeUser } from '@/lib/auth/session';

const bodySchema = z.object({
  email:    z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid credentials.' }, { status: 400 });
  }
  const { email, password } = parsed.data;

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
  }
  if (user.status === 'suspended') {
    return NextResponse.json({ error: 'This account has been suspended.' }, { status: 403 });
  }

  const safe = toSafeUser(user);
  await setAuthCookie(safe);
  return NextResponse.json({ user: safe });
}
