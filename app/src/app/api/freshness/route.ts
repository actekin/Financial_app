import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';

// Per-account data freshness: when each account last received a transaction,
// balance snapshot, or upload — so the UI can show what needs re-feeding.
export async function GET() {
  try {
    const accounts = await db.all(
      'SELECT * FROM accounts WHERE is_active = 1 ORDER BY group_name, name'
    );

    const latestSnapshots = await db.all(`
      SELECT s.account_id, s.date, s.balance, s.currency, s.source, s.updated_by, s.updated_at
      FROM snapshots s
      INNER JOIN (
        SELECT account_id, MAX(date) AS max_date FROM snapshots GROUP BY account_id
      ) latest ON latest.account_id = s.account_id AND latest.max_date = s.date
    `);

    const latestTransactions = await db.all(`
      SELECT account_id, MAX(date) AS last_transaction_date, COUNT(*) AS transaction_count
      FROM transactions GROUP BY account_id
    `);

    const latestUploads = await db.all(`
      SELECT u.account_id, u.uploaded_at, u.filename, u.uploaded_by
      FROM upload_logs u
      INNER JOIN (
        SELECT account_id, MAX(uploaded_at) AS max_at FROM upload_logs GROUP BY account_id
      ) latest ON latest.account_id = u.account_id AND latest.max_at = u.uploaded_at
    `);

    const snapshotByAccount = new Map(latestSnapshots.map(s => [s.accountId, s]));
    const txByAccount = new Map(latestTransactions.map(t => [t.accountId, t]));
    const uploadByAccount = new Map(latestUploads.map(u => [u.accountId, u]));

    const result = accounts.map(account => {
      const snapshot = snapshotByAccount.get(account.id);
      const tx = txByAccount.get(account.id);
      const upload = uploadByAccount.get(account.id);

      // Most recent of: snapshot date, transaction date — the date through
      // which this account's picture is accurate.
      const dates = [snapshot?.date, tx?.lastTransactionDate].filter(Boolean) as string[];
      const lastDataDate = dates.length > 0 ? dates.sort().at(-1) : null;

      return {
        account,
        latestSnapshot: snapshot
          ? {
              date: snapshot.date,
              balance: snapshot.balance,
              currency: snapshot.currency,
              source: snapshot.source,
              updatedBy: snapshot.updatedBy ?? null,
              updatedAt: snapshot.updatedAt ?? null,
            }
          : null,
        lastTransactionDate: tx?.lastTransactionDate ?? null,
        transactionCount: tx?.transactionCount ?? 0,
        lastUpload: upload
          ? {
              uploadedAt: upload.uploadedAt,
              filename: upload.filename,
              uploadedBy: upload.uploadedBy ?? null,
            }
          : null,
        lastDataDate,
      };
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Error computing freshness:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
