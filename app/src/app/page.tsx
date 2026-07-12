'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { SankeyChart } from '@/components/sankey/sankey-chart';
import { fromCents } from '@/lib/utils/money';
import { CATEGORY_LABELS, AutoCategory, TransactionDirection, Account, Transaction, getBankLabel } from '@/types';
import { FinancialContext } from '@/lib/advisor/analysis';
import { Card, CardHeader } from '@/components/ui/card';
import { PageHeader, Skeleton, EmptyState } from '@/components/ui/primitives';
import { MonthlyTrendChart } from '@/components/charts/monthly-trend';
import { GoalProgressList } from '@/components/charts/goal-progress';
import { fullMoney } from '@/components/charts/common';
import {
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  TrendingUp,
  TrendingDown,
  X,
  GitBranch,
  Target,
  Sparkles,
} from 'lucide-react';

interface SankeyData {
  nodes: Array<{ id: string; label: string; type: string; value?: number; color?: string }>;
  links: Array<{ source: string; target: string; value: number; color: string; category: string; count: number }>;
  summary: {
    startBalance: number;
    endBalance: number;
    totalInflows: number;
    totalOutflows: number;
    netFlow: number;
  };
  accounts: Array<Account & { startBalance: number; endBalance: number }>;
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  tone = 'default',
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  sub?: React.ReactNode;
  tone?: 'default' | 'good' | 'bad';
}) {
  const valueColor = tone === 'good' ? 'text-emerald-400' : tone === 'bad' ? 'text-red-400' : 'text-white';
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 text-gray-500 text-xs mb-2">
        <Icon className="w-3.5 h-3.5" /> {label}
      </div>
      <div className={`text-xl font-semibold tracking-tight ${valueColor}`}>{value}</div>
      {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
    </Card>
  );
}

export default function DashboardPage() {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 3);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [sankeyData, setSankeyData] = useState<SankeyData | null>(null);
  const [context, setContext] = useState<FinancialContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categoryTransactions, setCategoryTransactions] = useState<Transaction[]>([]);
  const [panelLoading, setPanelLoading] = useState(false);

  const fetchSankey = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/sankey?startDate=${startDate}&endDate=${endDate}`);
      const data = await res.json();
      setSankeyData(data);
    } catch (err) {
      console.error('Failed to fetch Sankey data:', err);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchSankey();
  }, [fetchSankey]);

  useEffect(() => {
    fetch('/api/advisor/context')
      .then(r => (r.ok ? r.json() : null))
      .then(data => setContext(data))
      .catch(() => {});
  }, []);

  async function handleLinkClick(category: string) {
    setSelectedCategory(category);
    setPanelLoading(true);
    try {
      const res = await fetch(`/api/transactions?startDate=${startDate}&endDate=${endDate}&category=${category}`);
      const data = await res.json();
      setCategoryTransactions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setPanelLoading(false);
    }
  }

  const hasData = sankeyData && sankeyData.nodes.length > 0 && sankeyData.links.length > 0;
  const currency = context?.primaryCurrency || 'USD';
  const cm = context?.currentMonth;

  const cashEntries = context ? Object.entries(context.cash.totalByCurrency) : [];
  const netThisMonth = cm ? cm.income - cm.spending : 0;

  return (
    <div className="p-4 md:p-8">
      <PageHeader
        title="Dashboard"
        subtitle="Your household finances at a glance"
        actions={
          <div className="flex items-end gap-3">
            <div>
              <label className="block text-[11px] text-gray-500 mb-1">From</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="bg-gray-900 border border-gray-800 rounded-xl px-3 py-1.5 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] text-gray-500 mb-1">To</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="bg-gray-900 border border-gray-800 rounded-xl px-3 py-1.5 text-sm text-white"
              />
            </div>
          </div>
        }
      />

      {/* Stat cards */}
      {context ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          <StatCard
            icon={Wallet}
            label="Total Cash"
            value={
              cashEntries.length > 0
                ? cashEntries.map(([cur, total]) => fullMoney(total, cur)).join(' · ')
                : '—'
            }
            sub={cashEntries.length > 1 ? 'Across currencies (no FX conversion)' : 'Across all accounts'}
          />
          <StatCard
            icon={ArrowDownRight}
            label="Income This Month"
            value={cm ? fullMoney(cm.income, currency) : '—'}
            sub={cm ? `Avg ${fullMoney(cm.avgMonthlyIncome, currency)}/month` : undefined}
            tone="good"
          />
          <StatCard
            icon={ArrowUpRight}
            label="Spending This Month"
            value={cm ? fullMoney(cm.spending, currency) : '—'}
            sub={
              cm && cm.spendingVsAvgPct !== null ? (
                <span className={cm.spendingVsAvgPct <= 0 ? 'text-emerald-500' : 'text-amber-500'}>
                  Tracking {cm.spendingVsAvgPct > 0 ? '+' : ''}
                  {cm.spendingVsAvgPct}% vs avg
                </span>
              ) : undefined
            }
            tone="bad"
          />
          <StatCard
            icon={netThisMonth >= 0 ? TrendingUp : TrendingDown}
            label="Net This Month"
            value={cm ? fullMoney(netThisMonth, currency) : '—'}
            sub="Income minus spending"
            tone={netThisMonth >= 0 ? 'good' : 'bad'}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          {[0, 1, 2, 3].map(i => (
            <Skeleton key={i} className="h-[104px]" />
          ))}
        </div>
      )}

      {/* Trend + goals */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-6">
        <Card className="xl:col-span-2">
          <CardHeader
            title={`Monthly spending (${currency})`}
            subtitle="Dashed line = trailing 12-month average · current month dimmed"
          />
          <div className="px-4 pb-4">
            {context && context.monthly.some(m => m.spending > 0 || m.income > 0) ? (
              <MonthlyTrendChart
                data={context.monthly}
                average={context.currentMonth.avgMonthlySpending}
                currency={currency}
                currentMonth={context.currentMonth.month}
              />
            ) : (
              <p className="text-sm text-gray-600 py-12 text-center">
                Upload statements to see your spending trend.
              </p>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Savings goals"
            action={
              <Link href="/goals" className="text-xs text-blue-400 hover:text-blue-300">
                Manage →
              </Link>
            }
          />
          <div className="px-5 pb-5">
            {context && context.goals.length > 0 ? (
              <GoalProgressList goals={context.goals} />
            ) : (
              <div className="py-4">
                <p className="text-sm text-gray-500 mb-3">
                  No goals yet. Set a target and the advisor will keep you honest.
                </p>
                <Link href="/goals" className="inline-flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300">
                  <Target className="w-4 h-4" /> Create your first goal
                </Link>
              </div>
            )}
            <Link
              href="/advisor"
              className="mt-4 flex items-center gap-2 text-xs text-violet-400 hover:text-violet-300 border-t border-gray-800/70 pt-3"
            >
              <Sparkles className="w-3.5 h-3.5" /> Ask the advisor about your money
            </Link>
          </div>
        </Card>
      </div>

      {/* Sankey */}
      <Card className="mb-6">
        <CardHeader
          title="Financial flow"
          subtitle={`${startDate} → ${endDate} · click a strand to see the transactions behind it`}
        />
        <div className="px-4 pb-4">
          {loading ? (
            <Skeleton className="h-[400px]" />
          ) : hasData ? (
            <div className="overflow-x-auto">
              <SankeyChart
                nodes={sankeyData!.nodes}
                links={sankeyData!.links}
                onLinkClick={handleLinkClick}
                width={900}
                height={Math.max(400, sankeyData!.nodes.length * 30)}
              />
            </div>
          ) : (
            <EmptyState
              icon={GitBranch}
              title="No flow data for this period"
              description={
                <>
                  <Link href="/accounts" className="text-blue-400 hover:underline">Add accounts</Link>
                  {', '}
                  <Link href="/upload" className="text-blue-400 hover:underline">upload statements</Link>
                  {', and set starting balances to see your money flows.'}
                </>
              }
            />
          )}
        </div>
      </Card>

      {/* Accounts */}
      {sankeyData?.accounts && sankeyData.accounts.length > 0 && (
        <Card>
          <CardHeader title="Reserves per account" subtitle="Change over the selected period" />
          <div className="px-5 pb-5 space-y-1">
            {sankeyData.accounts.map(account => {
              const delta = account.endBalance - account.startBalance;
              return (
                <div
                  key={account.id}
                  className="flex items-center justify-between py-2.5 border-b border-gray-800/50 last:border-0"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center text-[10px] font-medium text-gray-500 shrink-0">
                      {account.currency}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm text-white truncate">{account.name}</div>
                      <div className="text-xs text-gray-500">{getBankLabel(account.bank)}</div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-mono tabular-nums text-white">
                      {fullMoney(account.endBalance, account.currency)}
                    </div>
                    <div
                      className={`text-xs font-mono tabular-nums ${
                        delta >= 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {delta >= 0 ? '+' : ''}
                      {fullMoney(delta, account.currency)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Transaction detail slide panel */}
      {selectedCategory && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setSelectedCategory(null)}>
          <div className="absolute inset-0 bg-black/50" />
          <div
            className="relative w-full max-w-md bg-gray-900 border-l border-gray-800 h-full overflow-y-auto shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-gray-900/95 backdrop-blur border-b border-gray-800 px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  {CATEGORY_LABELS[selectedCategory as AutoCategory] || selectedCategory}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {categoryTransactions.length} transactions
                  {categoryTransactions.length > 0 &&
                    ` — total ${fromCents(
                      categoryTransactions.reduce((s, t) => s + t.originalAmount, 0)
                    ).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                </p>
              </div>
              <button
                onClick={() => setSelectedCategory(null)}
                className="text-gray-500 hover:text-gray-300 p-1.5 rounded-lg hover:bg-gray-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-4">
              {panelLoading ? (
                <p className="text-gray-500 animate-pulse py-8 text-center">Loading…</p>
              ) : categoryTransactions.length === 0 ? (
                <p className="text-gray-500 py-8 text-center">No transactions found.</p>
              ) : (
                <div className="space-y-1">
                  {[...categoryTransactions]
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .map(tx => (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between gap-4 py-2.5 border-b border-gray-800/50"
                      >
                        <div className="min-w-0">
                          <div className="text-sm text-gray-200 truncate">{tx.description}</div>
                          <div className="text-xs text-gray-500">{tx.date}</div>
                        </div>
                        <div
                          className={`text-sm font-mono tabular-nums shrink-0 ${
                            tx.direction === TransactionDirection.INFLOW ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          {tx.direction === TransactionDirection.INFLOW ? '+' : '-'}
                          {fullMoney(tx.originalAmount, tx.originalCurrency)}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
