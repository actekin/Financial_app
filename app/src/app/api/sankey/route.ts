import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { fromCents } from '@/lib/utils/money';
import { AutoCategory, CATEGORY_LABELS, CATEGORY_COLORS, TransactionDirection } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'startDate and endDate required' }, { status: 400 });
    }

    // Get all accounts
    const allAccounts = await db.all('SELECT * FROM accounts ORDER BY id');

    // Get all transactions in date range (excluding flow-excluded and transfers)
    const allTransactions = await db.all(
      `SELECT * FROM transactions
       WHERE date >= ? AND date <= ?
         AND exclude_from_flow = 0
         AND is_transfer = 0`,
      [startDate, endDate]
    );

    // Get snapshots for start date (closest before or on start date)
    const startSnapshots = await db.all(
      'SELECT * FROM snapshots WHERE date <= ?',
      [startDate]
    );

    // Group snapshots by account (take latest before start date)
    const startBalances: Record<number, number> = {};
    for (const snap of startSnapshots) {
      const snapAccountId = snap.accountId as number;
      const snapDate = snap.date as string;
      const snapBalance = snap.balance as number;
      if (!startBalances[snapAccountId] || snapDate >= (startSnapshots.find(
        s => (s.accountId as number) === snapAccountId && (s.id as number) !== (snap.id as number)
      )?.date as string || '')) {
        startBalances[snapAccountId] = snapBalance;
      }
    }

    // Group transactions by category and direction
    const inflowsByCategory: Record<string, { total: number; count: number; transactions: typeof allTransactions }> = {};
    const outflowsByCategory: Record<string, { total: number; count: number; transactions: typeof allTransactions }> = {};

    for (const tx of allTransactions) {
      const category = (tx.autoCategory as string) || 'other';
      const bucket = tx.direction === TransactionDirection.INFLOW ? inflowsByCategory : outflowsByCategory;

      if (!bucket[category]) {
        bucket[category] = { total: 0, count: 0, transactions: [] };
      }
      bucket[category].total += tx.originalAmount as number;
      bucket[category].count++;
      bucket[category].transactions.push(tx);
    }

    // Build Sankey nodes and links
    const nodes: Array<{ id: string; label: string; type: string; value?: number; color?: string }> = [];
    const links: Array<{ source: string; target: string; value: number; color: string; category: string; count: number }> = [];

    // Starting state node
    let totalStartBalance = 0;
    for (const account of allAccounts) {
      const bal = startBalances[account.id as number] || 0;
      totalStartBalance += bal;
      nodes.push({
        id: `start_${account.id}`,
        label: `${account.name}: ${fromCents(bal).toFixed(2)}`,
        type: 'account_start',
        value: bal,
      });
    }

    nodes.push({ id: 'start', label: 'Starting Reserves', type: 'start_total', value: totalStartBalance });

    // Ending state — compute from start + inflows - outflows per account
    const accountFlows: Record<number, number> = {};
    for (const tx of allTransactions) {
      const txAccountId = tx.accountId as number;
      if (!accountFlows[txAccountId]) accountFlows[txAccountId] = 0;
      accountFlows[txAccountId] += tx.direction === TransactionDirection.INFLOW
        ? (tx.originalAmount as number)
        : -(tx.originalAmount as number);
    }

    let totalEndBalance = 0;
    for (const account of allAccounts) {
      const acctId = account.id as number;
      const startBal = startBalances[acctId] || 0;
      const flow = accountFlows[acctId] || 0;
      const endBal = startBal + flow;
      totalEndBalance += endBal;
      nodes.push({
        id: `end_${account.id}`,
        label: `${account.name}: ${fromCents(endBal).toFixed(2)}`,
        type: 'account_end',
        value: endBal,
      });
    }

    nodes.push({ id: 'end', label: 'Ending Reserves', type: 'end_total', value: totalEndBalance });

    // Inflow category nodes + links
    for (const [category, data] of Object.entries(inflowsByCategory)) {
      const cat = category as AutoCategory;
      const color = CATEGORY_COLORS[cat] || '#9ca3af';
      nodes.push({
        id: `inflow_${category}`,
        label: CATEGORY_LABELS[cat] || category,
        type: 'inflow',
        value: data.total,
        color,
      });
      links.push({
        source: `inflow_${category}`,
        target: 'end',
        value: data.total,
        color,
        category,
        count: data.count,
      });
    }

    // Outflow category nodes + links
    for (const [category, data] of Object.entries(outflowsByCategory)) {
      const cat = category as AutoCategory;
      const color = CATEGORY_COLORS[cat] || '#9ca3af';
      nodes.push({
        id: `outflow_${category}`,
        label: CATEGORY_LABELS[cat] || category,
        type: 'outflow',
        value: data.total,
        color,
      });
      links.push({
        source: 'start',
        target: `outflow_${category}`,
        value: data.total,
        color,
        category,
        count: data.count,
      });
    }

    // Reserves flow (start -> end for remaining balance)
    const totalInflows = Object.values(inflowsByCategory).reduce((s, d) => s + d.total, 0);
    const totalOutflows = Object.values(outflowsByCategory).reduce((s, d) => s + d.total, 0);

    if (totalStartBalance > 0) {
      links.push({
        source: 'start',
        target: 'end',
        value: Math.max(totalStartBalance - totalOutflows, 0),
        color: '#3b82f6',
        category: 'reserves_carried',
        count: 0,
      });
    }

    return NextResponse.json({
      nodes,
      links: links.filter(l => l.value > 0),
      summary: {
        startBalance: totalStartBalance,
        endBalance: totalEndBalance,
        totalInflows,
        totalOutflows,
        netFlow: totalInflows - totalOutflows,
      },
      accounts: allAccounts.map(a => ({
        ...a,
        startBalance: startBalances[a.id as number] || 0,
        endBalance: (startBalances[a.id as number] || 0) + (accountFlows[a.id as number] || 0),
      })),
    });
  } catch (error: unknown) {
    console.error('Error building sankey data:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
