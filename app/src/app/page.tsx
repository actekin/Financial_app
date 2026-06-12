'use client';

import { useState, useEffect } from 'react';
import { SankeyChart } from '@/components/sankey/sankey-chart';
import { fromCents } from '@/lib/utils/money';
import { CATEGORY_LABELS, AutoCategory, TransactionDirection, Account, Transaction, getBankLabel } from '@/types';
import { ArrowUpRight, ArrowDownRight, Wallet, TrendingUp, X, Zap } from 'lucide-react';

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

interface FreshnessEntry {
  account: Account;
  lastDataDate: string | null;
  latestSnapshot: { date: string; updatedBy: string | null } | null;
}

const STALE_AFTER_DAYS = 7;

function dataAgeDays(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const then = new Date(dateStr.slice(0, 10) + 'T00:00:00');
  if (isNaN(then.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - then.getTime()) / 86_400_000));
}

export default function DashboardPage() {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 3);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [sankeyData, setSankeyData] = useState<SankeyData | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categoryTransactions, setCategoryTransactions] = useState<Transaction[]>([]);
  const [panelLoading, setPanelLoading] = useState(false);
  const [freshness, setFreshness] = useState<FreshnessEntry[]>([]);

  useEffect(() => {
    fetchSankey();
  }, [startDate, endDate]);

  useEffect(() => {
    fetch('/api/freshness')
      .then(r => (r.ok ? r.json() : []))
      .then(data => { if (Array.isArray(data)) setFreshness(data); })
      .catch(() => {});
  }, []);

  async function fetchSankey() {
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
  }

  async function handleLinkClick(category: string, direction: string) {
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

  const summary = sankeyData?.summary;
  const hasData = sankeyData && sankeyData.nodes.length > 0 && sankeyData.links.length > 0;

  const staleAccounts = freshness.filter(f => {
    const age = dataAgeDays(f.lastDataDate);
    return age === null || age > STALE_AFTER_DAYS;
  });
  const freshnessByAccountId = new Map(freshness.map(f => [f.account.id, f]));

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400 text-sm mt-1">Your financial flows at a glance</p>
        </div>
        <div className="flex items-center gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white"
            />
          </div>
        </div>
      </div>

      {/* Stale data warning */}
      {staleAccounts.length > 0 && freshness.length > 0 && (
        <div className="mb-6 bg-yellow-950/30 border border-yellow-900 rounded-xl p-4 flex items-center justify-between gap-4">
          <p className="text-sm text-yellow-300">
            {staleAccounts.length === freshness.length
              ? 'Your accounts have no recent data — this snapshot may be out of date.'
              : `${staleAccounts.length} of ${freshness.length} accounts ${staleAccounts.length === 1 ? 'has' : 'have'} no data from the last ${STALE_AFTER_DAYS} days: ${staleAccounts.slice(0, 4).map(f => f.account.name).join(', ')}${staleAccounts.length > 4 ? '…' : ''}.`}
          </p>
          <a
            href="/quick-update"
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 text-white text-xs rounded-lg transition-colors"
          >
            <Zap className="w-3.5 h-3.5" /> Quick Update
          </a>
        </div>
      )}

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="flex items-center gap-2 text-gray-400 text-xs mb-2">
              <Wallet className="w-3.5 h-3.5" /> Starting Reserves
            </div>
            <div className="text-xl font-semibold text-white">
              {fromCents(summary.startBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="flex items-center gap-2 text-green-400 text-xs mb-2">
              <ArrowDownRight className="w-3.5 h-3.5" /> Total Inflows
            </div>
            <div className="text-xl font-semibold text-green-400">
              +{fromCents(summary.totalInflows).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="flex items-center gap-2 text-red-400 text-xs mb-2">
              <ArrowUpRight className="w-3.5 h-3.5" /> Total Outflows
            </div>
            <div className="text-xl font-semibold text-red-400">
              -{fromCents(summary.totalOutflows).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="flex items-center gap-2 text-blue-400 text-xs mb-2">
              <TrendingUp className="w-3.5 h-3.5" /> Ending Reserves
            </div>
            <div className="text-xl font-semibold text-white">
              {fromCents(summary.endBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      )}

      {/* Sankey Chart */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
        <h2 className="text-sm font-medium text-gray-400 mb-4">Financial Flow</h2>
        {loading ? (
          <div className="h-[500px] flex items-center justify-center">
            <p className="text-gray-500 animate-pulse">Loading flow chart...</p>
          </div>
        ) : hasData ? (
          <SankeyChart
            nodes={sankeyData!.nodes}
            links={sankeyData!.links}
            onLinkClick={handleLinkClick}
            width={900}
            height={Math.max(400, (sankeyData!.nodes.length) * 30)}
          />
        ) : (
          <div className="h-[300px] flex items-center justify-center">
            <div className="text-center">
              <p className="text-gray-500 mb-3">No flow data yet.</p>
              <p className="text-gray-600 text-sm">
                <a href="/accounts" className="text-blue-400 hover:underline">Add accounts</a>
                {' and '}
                <a href="/upload" className="text-blue-400 hover:underline">upload statements</a>
                {' to see your financial flows.'}
              </p>
              <p className="text-gray-600 text-sm mt-1">
                Don&apos;t forget to set starting balances on the{' '}
                <a href="/accounts" className="text-blue-400 hover:underline">accounts page</a>.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Accounts Breakdown */}
      {sankeyData?.accounts && sankeyData.accounts.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-sm font-medium text-gray-400 mb-4">Reserves Per Account</h2>
          <div className="space-y-3">
            {sankeyData.accounts.map(account => {
              const startBal = fromCents(account.startBalance);
              const endBal = fromCents(account.endBalance);
              const delta = endBal - startBal;
              const fresh = freshnessByAccountId.get(account.id);
              const age = fresh ? dataAgeDays(fresh.lastDataDate) : null;
              return (
                <div key={account.id} className="flex items-center justify-between py-2 border-b border-gray-800/50 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-gray-800 flex items-center justify-center text-[10px] font-medium text-gray-500">
                      {account.currency}
                    </div>
                    <div>
                      <div className="text-sm text-white">{account.name}</div>
                      <div className="text-xs text-gray-500">
                        {getBankLabel(account.bank)}
                        {fresh && (
                          age === null ? (
                            <span className="text-red-400"> · no data</span>
                          ) : age > STALE_AFTER_DAYS ? (
                            <span className="text-yellow-400"> · data from {age}d ago</span>
                          ) : (
                            <span> · updated {age === 0 ? 'today' : `${age}d ago`}</span>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-mono tabular-nums text-white">
                      {endBal.toLocaleString(undefined, { minimumFractionDigits: 2 })} {account.currency}
                    </div>
                    <div className={`text-xs font-mono tabular-nums ${delta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {delta >= 0 ? '+' : ''}{delta.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Transaction Detail Slide Panel */}
      {selectedCategory && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setSelectedCategory(null)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative w-[480px] bg-gray-900 border-l border-gray-800 h-full overflow-y-auto shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  {CATEGORY_LABELS[selectedCategory as AutoCategory] || selectedCategory}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {categoryTransactions.length} transactions
                  {categoryTransactions.length > 0 && ` \u2014 Total: ${
                    fromCents(categoryTransactions.reduce((s, t) => s + t.originalAmount, 0))
                      .toLocaleString(undefined, { minimumFractionDigits: 2 })
                  }`}
                </p>
              </div>
              <button onClick={() => setSelectedCategory(null)} className="text-gray-500 hover:text-gray-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-4">
              {panelLoading ? (
                <p className="text-gray-500 animate-pulse py-8 text-center">Loading...</p>
              ) : categoryTransactions.length === 0 ? (
                <p className="text-gray-500 py-8 text-center">No transactions found.</p>
              ) : (
                <div className="space-y-2">
                  {categoryTransactions
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .map(tx => (
                      <div key={tx.id} className="flex items-center justify-between py-2.5 border-b border-gray-800/50">
                        <div>
                          <div className="text-sm text-gray-200">{tx.description}</div>
                          <div className="text-xs text-gray-500">{tx.date}</div>
                        </div>
                        <div className={`text-sm font-mono tabular-nums ${
                          tx.direction === TransactionDirection.INFLOW ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {tx.direction === TransactionDirection.INFLOW ? '+' : '-'}
                          {fromCents(tx.originalAmount).toFixed(2)} {tx.originalCurrency}
                        </div>
                      </div>
                    ))
                  }
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
