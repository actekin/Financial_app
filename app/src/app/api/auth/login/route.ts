import { NextRequest, NextResponse } from 'next/server';
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  isAuthEnabled,
} from '@/lib/auth/session';

export async function POST(request: NextRequest) {
  try {
    if (!isAuthEnabled()) {
      return NextResponse.json({ error: 'Auth is not enabled on this server' }, { status: 400 });
    }

    const { name, password } = await request.json();
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Please tell us who you are' }, { status: 400 });
    }
    if (password !== process.env.APP_PASSWORD) {
      return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
    }

    const token = await createSessionToken(name.trim().slice(0, 40));
    const response = NextResponse.json({ success: true, name: name.trim() });
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: SESSION_MAX_AGE_SECONDS,
      path: '/',
    });
    return response;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
