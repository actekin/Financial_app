import { NextRequest, NextResponse } from 'next/server';
import {
  getTokenFromCookieHeader,
  isAuthEnabled,
  verifySessionToken,
} from '@/lib/auth/session';

// Paths reachable without a session: the login flow itself, plus the
// session-info endpoint (it only reveals whether auth is enabled and the
// caller's own session name).
const PUBLIC_PATHS = ['/login', '/api/auth/login', '/api/auth/me'];

export default async function proxy(request: NextRequest) {
  if (!isAuthEnabled()) return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.includes(pathname)) return NextResponse.next();

  const token = getTokenFromCookieHeader(request.headers.get('cookie'));
  const session = await verifySessionToken(token);
  if (session) return NextResponse.next();

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = '/login';
  loginUrl.search = '';
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Protect everything except Next.js internals and static assets.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.svg$).*)'],
};
