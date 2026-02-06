import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { transactions, accounts, snapshots } from '@/lib/db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import { fromCents } from '@/lib/utils/money';
import { AutoCategory, CATEGORY_LABELS, CATEGORY_COLORS, TransactionDirection } from '@/types';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  if (!startDate || !endDate) {
    return NextResponse.json({ error: 'startDate and endDate required' }, { status: 400 });
  }

  // Get all accounts
  const allAccounts = db.select().from(accounts).all();

  // Get all transactions in date range (excluding flow-excluded ones)
  const allTransactions = db.select().from(transactions)
    .where(and(
      gte(transactions.date, startDate),
      lte(transactions.date, endDate),
      eq(transactions.excludeFromFlow, false),
      eq(transactions.isTransfer, false),
    ))
    .all();

  // Get snapshots for start date (closest before or on start date)
  const startSnapshots = db.select().from(snapshots)
    .where(lte(snapshots.date, startDate))
    .all();

  // Group snapshots by account (take latest before start date)
  const startBalances: Record<number, number> = {};
  for (const snap of startSnapshots) {
    if (!startBalances[snap.accountId] || snap.date >= (startSnapshots.find(s => s.accountId === snap.accountId && s.id !== snap.id)?.date || '')) {
      startBalances[snap.accountId] = snap.balance;
    }
  }

  // Group transactions by category and direction
  const inflowsByCategory: Record<string, { total: number; count: number; transactions: typeof allTransactions }> = {};
  const outflowsByCategory: Record<string, { total: number; count: number; transactions: typeof allTransactions }> = {};

  for (const tx of allTransactions) {
    const category = tx.autoCategory || 'other';
    const bucket = tx.direction === TransactionDirection.INFLOW ? inflowsByCategory : outflowsByCategory;

    if (!bucket[category]) {
      bucket[category] = { total: 0, count: 0, transactions: [] };
    }
    bucket[category].total += tx.originalAmount;
    bucket[category].count++;
    bucket[category].transactions.push(tx);
  }

  // Build Sankey nodes and links
  const nodes: Array<{ id: string; label: string; type: string; value?: number; color?: string }> = [];
  const links: Array<{ source: string; target: string; value: number; color: string; category: string; count: number }> = [];

  // Starting state node
  let totalStartBalance = 0;
  for (const account of allAccounts) {
    const bal = startBalances[account.id] || 0;
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
    if (!accountFlows[tx.accountId]) accountFlows[tx.accountId] = 0;
    accountFlows[tx.accountId] += tx.direction === TransactionDirection.INFLOW
      ? tx.originalAmount
      : -tx.originalAmount;
  }

  let totalEndBalance = 0;
  for (const account of allAccounts) {
    const startBal = startBalances[account.id] || 0;
    const flow = accountFlows[account.id] || 0;
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
  const reservesUsed = Math.max(0, totalStartBalance - (totalEndBalance - totalInflows));

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
      startBalance: startBalances[a.id] || 0,
      endBalance: (startBalances[a.id] || 0) + (accountFlows[a.id] || 0),
    })),
  });
}
