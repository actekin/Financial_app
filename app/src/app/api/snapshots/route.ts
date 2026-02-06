import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { snapshots } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { toCents } from '@/lib/utils/money';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get('accountId');

  const result = accountId
    ? db.select().from(snapshots).where(eq(snapshots.accountId, parseInt(accountId))).all()
    : db.select().from(snapshots).all();

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { accountId, date, balance, currency, source } = body;

  if (!accountId || !date || balance === undefined || !currency) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Upsert: if a snapshot exists for this account+date, update it
  const existing = db.select().from(snapshots)
    .where(and(eq(snapshots.accountId, accountId), eq(snapshots.date, date)))
    .get();

  if (existing) {
    db.update(snapshots)
      .set({ balance: toCents(balance), currency, source: source || 'manual' })
      .where(eq(snapshots.id, existing.id))
      .run();

    return NextResponse.json({ ...existing, balance: toCents(balance) });
  }

  const result = db.insert(snapshots).values({
    accountId,
    date,
    balance: toCents(balance),
    currency,
    source: source || 'manual',
  }).returning().get();

  return NextResponse.json(result, { status: 201 });
}
