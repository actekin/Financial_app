import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE, isAuthEnabled, verifySessionToken } from '@/lib/auth/session';

const PUBLIC_PATHS = ['/login', '/api/auth/login', '/api/auth/me'];

export async function middleware(request: NextRequest) {
  if (!isAuthEnabled()) return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySessionToken(token);
  if (session) return NextResponse.next();

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const loginUrl = new URL('/login', request.url);
  if (pathname !== '/') loginUrl.searchParams.set('from', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Everything except Next.js internals and static assets
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.svg$).*)'],
};
