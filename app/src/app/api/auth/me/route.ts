import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, isAuthEnabled } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
  if (!isAuthEnabled()) {
    return NextResponse.json({ authEnabled: false, name: null });
  }
  const session = await getSessionFromRequest(request);
  return NextResponse.json({ authEnabled: true, name: session?.name ?? null });
}
