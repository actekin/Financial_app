import { NextRequest, NextResponse } from 'next/server';
import {
  SESSION_COOKIE,
  getHouseholdMembers,
  isAuthEnabled,
  verifySessionToken,
} from '@/lib/auth/session';

export async function GET(request: NextRequest) {
  const authEnabled = isAuthEnabled();
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = authEnabled ? await verifySessionToken(token) : null;

  return NextResponse.json({
    authEnabled,
    user: session?.name ?? null,
    members: getHouseholdMembers(),
  });
}
