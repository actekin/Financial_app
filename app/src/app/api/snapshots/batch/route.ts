import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { toCents } from '@/lib/utils/money';
import { getSessionFromRequest } from '@/lib/auth/session';

interface IncomingSnapshot {
  accountId: number;
  date: string;
  balance: number;
  currency?: string;
}

// Upsert balance snapshots for many accounts in one request — powers the
// Quick Update page's "save all" action.
export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    const body = await request.json();
    const snapshots = body.snapshots as IncomingSnapshot[];

    if (!Array.isArray(snapshots) || snapshots.length === 0) {
      return NextResponse.json({ error: 'Missing snapshots array' }, { status: 400 });
    }

    let saved = 0;
    const errors: string[] = [];

    for (const snap of snapshots) {
      if (!snap.accountId || !snap.date || snap.balance === undefined || snap.balance === null) {
        errors.push(`Invalid snapshot entry: ${JSON.stringify(snap)}`);
        continue;
      }

      const account = await db.get('SELECT * FROM accounts WHERE id = ?', [snap.accountId]);
      if (!account) {
        errors.push(`Account ${snap.accountId} not found`);
        continue;
      }

      const balanceCents = toCents(snap.balance);
      const currency = snap.currency || (account.currency as string);
      const updatedBy = session?.name ?? null;

      const existing = await db.get(
        'SELECT id FROM snapshots WHERE account_id = ? AND date = ?',
        [snap.accountId, snap.date]
      );

      if (existing) {
        await db.run(
          `UPDATE snapshots SET balance = ?, currency = ?, source = 'manual', updated_by = ?, updated_at = datetime('now') WHERE id = ?`,
          [balanceCents, currency, updatedBy, existing.id]
        );
      } else {
        await db.run(
          `INSERT INTO snapshots (account_id, date, balance, currency, source, updated_by, updated_at)
           VALUES (?, ?, ?, ?, 'manual', ?, datetime('now'))`,
          [snap.accountId, snap.date, balanceCents, currency, updatedBy]
        );
      }
      saved++;
    }

    return NextResponse.json({ saved, errors });
  } catch (error: unknown) {
    console.error('Error saving snapshot batch:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
