import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const AUTH_COOKIE = 'flowai_token';

const PROTECTED_PREFIXES = ['/dashboard', '/form', '/results', '/flows', '/admin'];
const AUTH_PAGES = ['/login', '/register', '/forgot-password'];

interface Claims {
  role?: 'user' | 'admin';
  emailVerified?: boolean;
}

async function getClaims(req: NextRequest): Promise<Claims | null> {
  const token = req.cookies.get(AUTH_COOKIE)?.value;
  if (!token || !process.env.JWT_SECRET) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET));
    return payload as Claims;
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const claims = await getClaims(req);

  // Signed-in users don't need the auth pages.
  if (claims && AUTH_PAGES.some((p) => pathname.startsWith(p))) {
    const home = claims.role === 'admin' ? '/admin' : '/dashboard';
    return NextResponse.redirect(new URL(home, req.url));
  }

  if (PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))) {
    if (!claims) {
      const login = new URL('/login', req.url);
      login.searchParams.set('next', pathname);
      return NextResponse.redirect(login);
    }
    if (pathname.startsWith('/admin') && claims.role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/form/:path*',
    '/results/:path*',
    '/flows/:path*',
    '/admin/:path*',
    '/login',
    '/register',
    '/forgot-password',
  ],
};
