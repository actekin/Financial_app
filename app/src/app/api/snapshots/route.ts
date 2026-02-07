import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { toCents } from '@/lib/utils/money';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    const result = accountId
      ? await db.all('SELECT * FROM snapshots WHERE account_id = ?', [parseInt(accountId)])
      : await db.all('SELECT * FROM snapshots');

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Error fetching snapshots:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accountId, date, balance, currency, source } = body;

    if (!accountId || !date || balance === undefined || !currency) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const balanceCents = toCents(balance);

    // Upsert: if a snapshot exists for this account+date, update it
    const existing = await db.get(
      'SELECT * FROM snapshots WHERE account_id = ? AND date = ?',
      [accountId, date]
    );

    if (existing) {
      await db.run(
        'UPDATE snapshots SET balance = ?, currency = ?, source = ? WHERE id = ?',
        [balanceCents, currency, source || 'manual', existing.id]
      );
      return NextResponse.json({ ...existing, balance: balanceCents });
    }

    const result = await db.run(
      'INSERT INTO snapshots (account_id, date, balance, currency, source) VALUES (?, ?, ?, ?, ?)',
      [accountId, date, balanceCents, currency, source || 'manual']
    );

    return NextResponse.json({
      id: result.lastId,
      accountId,
      date,
      balance: balanceCents,
      currency,
      source: source || 'manual',
    }, { status: 201 });
  } catch (error: unknown) {
    console.error('Error saving snapshot:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
