import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { transactions, uploadLogs, accounts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { categorizeTransaction } from '@/lib/categorizer/engine';
import { transactionFingerprint } from '@/lib/utils/dedup';
import { toCents } from '@/lib/utils/money';
import { TransactionDirection, Currency } from '@/types';

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
  const account = db.select().from(accounts).where(eq(accounts.id, accountId)).get();
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

    const existing = db.select()
      .from(transactions)
      .where(eq(transactions.fingerprint, fp))
      .get();

    if (existing) {
      skipped++;
      continue;
    }

    // Auto-categorize
    const autoCategory = categorizeTransaction(tx.description, direction);

    // Determine if this is a Trading 212 market trade (exclude from flow)
    const excludeFromFlow = tx.excludeFromFlow || false;

    db.insert(transactions).values({
      accountId,
      date: dateStr,
      originalAmount: amountCents,
      originalCurrency: tx.currency || account.currency,
      description: tx.description,
      rawDescription: tx.description,
      direction,
      autoCategory,
      isRecurring: false,
      isTransfer: false,
      excludeFromFlow,
      fingerprint: fp,
    }).run();

    imported++;
  }

  // Log the upload
  db.insert(uploadLogs).values({
    accountId,
    filename: filename || 'upload',
    rowsImported: imported,
    rowsSkipped: skipped,
    dateRangeStart: dateStart,
    dateRangeEnd: dateEnd,
  }).run();

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
