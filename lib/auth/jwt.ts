import { SignJWT, jwtVerify } from 'jose';
import type { SafeUser } from '@/src/schema';

/** Claims embedded in every token. */
export interface JWTPayload {
  sub:           string;   // user id
  name:          string;
  email:         string;
  role:          'user' | 'admin';
  emailVerified: boolean;
}

const TOKEN_EXPIRY = '30d';
const ALGORITHM    = 'HS256';

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET ?? process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  const fallbackSecret = process.env.DATABASE_URL ?? process.env.APP_URL ?? 'flowai-auth-fallback-secret';
  return new TextEncoder().encode(secret ?? fallbackSecret);
}

export async function signToken(user: SafeUser): Promise<string> {
  return new SignJWT({
    name:          user.name,
    email:         user.email,
    role:          user.role,
    emailVerified: user.emailVerified,
  } satisfies Omit<JWTPayload, 'sub'>)
    .setProtectedHeader({ alg: ALGORITHM })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(getSecret());
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return {
      sub:           payload.sub as string,
      name:          payload['name'] as string,
      email:         payload['email'] as string,
      role:          payload['role'] as 'user' | 'admin',
      emailVerified: payload['emailVerified'] as boolean,
    };
  } catch {
    return null;
  }
}
