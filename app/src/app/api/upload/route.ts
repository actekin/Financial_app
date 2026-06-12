import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { categorizeTransaction } from '@/lib/categorizer/engine';
import { transactionFingerprint } from '@/lib/utils/dedup';
import { toCents } from '@/lib/utils/money';
import { getSessionFromRequest } from '@/lib/auth/session';
import { TransactionDirection } from '@/types';

interface IncomingTransaction {
  date: string;
  description: string;
  amount: number;
  direction: 'inflow' | 'outflow';
  currency: string;
  balance?: number;
  excludeFromFlow?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accountId, filename, transactions: txns } = body as {
      accountId: number;
      filename: string;
      transactions: IncomingTransaction[];
    };

    if (!accountId || !txns || !Array.isArray(txns)) {
      return NextResponse.json({ error: 'Missing accountId or transactions' }, { status: 400 });
    }

    // Verify account exists
    const account = await db.get('SELECT * FROM accounts WHERE id = ?', [accountId]);
    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    let imported = 0;
    let skipped = 0;
    let dateStart: string | null = null;
    let dateEnd: string | null = null;

    for (const tx of txns) {
      if (!tx.date || tx.amount === undefined) {
        skipped++;
        continue;
      }

      const dateStr = tx.date.slice(0, 10); // YYYY-MM-DD
      const direction = tx.direction as TransactionDirection;
      const amountCents = toCents(tx.amount);

      // Track date range
      if (!dateStart || dateStr < dateStart) dateStart = dateStr;
      if (!dateEnd || dateStr > dateEnd) dateEnd = dateStr;

      // Check for duplicates
      const fp = transactionFingerprint(
        accountId,
        dateStr,
        tx.amount,
        direction,
        tx.description
      );

      const existing = await db.get(
        'SELECT id FROM transactions WHERE fingerprint = ?',
        [fp]
      );

      if (existing) {
        skipped++;
        continue;
      }

      // Auto-categorize
      const autoCategory = categorizeTransaction(tx.description, direction);

      // Determine if this is a Trading 212 market trade (exclude from flow)
      const excludeFromFlow = tx.excludeFromFlow ? 1 : 0;

      await db.run(
        `INSERT INTO transactions (account_id, date, original_amount, original_currency, description, raw_description, direction, auto_category, is_recurring, is_transfer, exclude_from_flow, fingerprint)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?)`,
        [
          accountId,
          dateStr,
          amountCents,
          tx.currency || account.currency,
          tx.description,
          tx.description,
          direction,
          autoCategory,
          excludeFromFlow,
          fp,
        ]
      );

      imported++;
    }

    // Log the upload
    const session = await getSessionFromRequest(request);
    await db.run(
      `INSERT INTO upload_logs (account_id, filename, rows_imported, rows_skipped, date_range_start, date_range_end, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [accountId, filename || 'upload', imported, skipped, dateStart, dateEnd, session?.name ?? null]
    );

    return NextResponse.json({
      imported,
      skipped,
      dateRange: { start: dateStart, end: dateEnd },
    });
  } catch (error: unknown) {
    console.error('Upload error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
