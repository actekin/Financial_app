import { NextRequest, NextResponse } from 'next/server';
import {
  SESSION_COOKIE,
  SESSION_DURATION_MS,
  checkPassword,
  createSessionToken,
  isAuthEnabled,
} from '@/lib/auth/session';

export async function POST(request: NextRequest) {
  try {
    if (!isAuthEnabled()) {
      return NextResponse.json({ error: 'Auth is not enabled on this server' }, { status: 400 });
    }

    const body = await request.json();
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (!name || name.length > 50) {
      return NextResponse.json({ error: 'Please enter your name' }, { status: 400 });
    }
    if (!checkPassword(password)) {
      return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
    }

    const token = await createSessionToken(name);
    const response = NextResponse.json({ name });
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: request.nextUrl.protocol === 'https:',
      maxAge: SESSION_DURATION_MS / 1000,
      path: '/',
    });
    return response;
  } catch (error: unknown) {
    console.error('Login error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
