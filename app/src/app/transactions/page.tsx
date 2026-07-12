'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Account, Transaction, AutoCategory, CATEGORY_LABELS, CATEGORY_COLORS, TransactionDirection } from '@/types';
import { fullMoney } from '@/components/charts/common';
import { Card } from '@/components/ui/card';
import { PageHeader, EmptyState, Skeleton, selectClass } from '@/components/ui/primitives';
import { List, Search } from 'lucide-react';

const PAGE_SIZE = 200;

export default function TransactionsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filterAccount, setFilterAccount] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [search, setSearch] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/accounts').then(r => (r.ok ? r.json() : [])),
      fetch('/api/transactions').then(r => (r.ok ? r.json() : [])),
    ])
      .then(([accts, txns]) => {
        if (Array.isArray(accts)) setAccounts(accts);
        if (Array.isArray(txns)) setTransactions(txns);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return transactions
      .filter(tx => {
        if (filterAccount && tx.accountId !== parseInt(filterAccount)) return false;
        if (filterCategory && tx.autoCategory !== filterCategory) return false;
        if (q && !tx.description.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, filterAccount, filterCategory, search]);

  const accountMap = Object.fromEntries(accounts.map(a => [a.id, a]));
  const categories = [...new Set(transactions.map(t => t.autoCategory))].sort();

  async function updateCategory(id: number, autoCategory: string) {
    await fetch('/api/transactions', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, autoCategory }),
    });
    setTransactions(prev =>
      prev.map(tx => (tx.id === id ? { ...tx, autoCategory: autoCategory as AutoCategory } : tx))
    );
  }

  if (loading) {
    return (
      <div className="p-4 md:p-8">
        <PageHeader title="Transactions" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <PageHeader
        title="Transactions"
        subtitle={`${transactions.length.toLocaleString()} transactions across all accounts`}
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setVisibleCount(PAGE_SIZE);
            }}
            placeholder="Search descriptions…"
            className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-10 pr-3.5 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/60"
          />
        </div>
        <select
          value={filterAccount}
          onChange={e => {
            setFilterAccount(e.target.value);
            setVisibleCount(PAGE_SIZE);
          }}
          className={`${selectClass} w-auto`}
        >
          <option value="">All accounts</option>
          {accounts.map(a => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <select
          value={filterCategory}
          onChange={e => {
            setFilterCategory(e.target.value);
            setVisibleCount(PAGE_SIZE);
          }}
          className={`${selectClass} w-auto`}
        >
          <option value="">All categories</option>
          {categories.map(c => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c as AutoCategory] || c}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={List}
            title={transactions.length === 0 ? 'No transactions yet' : 'Nothing matches these filters'}
            description={
              transactions.length === 0 ? (
                <>
                  <Link href="/upload" className="text-blue-400 hover:underline">
                    Upload a bank statement
                  </Link>{' '}
                  to get started.
                </>
              ) : (
                'Try clearing the search or filters.'
              )
            }
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto max-h-[calc(100vh-260px)] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-800/60 sticky top-0 backdrop-blur z-10">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Date</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Account</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Description</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Category</th>
                  <th className="text-right px-4 py-3 text-gray-400 font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, visibleCount).map(tx => {
                  const account = accountMap[tx.accountId];
                  const cat = tx.autoCategory as AutoCategory;
                  return (
                    <tr key={tx.id} className="border-t border-gray-800/50 hover:bg-gray-800/30">
                      <td className="px-4 py-2.5 text-gray-400 whitespace-nowrap">{tx.date}</td>
                      <td className="px-4 py-2.5 text-gray-400 whitespace-nowrap text-xs">
                        {account?.name || `#${tx.accountId}`}
                      </td>
                      <td className="px-4 py-2.5 text-gray-200 max-w-sm truncate">{tx.description}</td>
                      <td className="px-4 py-2.5">
                        <select
                          value={tx.autoCategory}
                          onChange={e => updateCategory(tx.id, e.target.value)}
                          className="bg-transparent text-xs px-2 py-1 rounded-lg border border-gray-700 hover:border-gray-600"
                          style={{ color: CATEGORY_COLORS[cat] || '#9ca3af' }}
                        >
                          {Object.values(AutoCategory).map(c => (
                            <option key={c} value={c} className="bg-gray-900 text-gray-300">
                              {CATEGORY_LABELS[c]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td
                        className={`px-4 py-2.5 text-right font-mono tabular-nums whitespace-nowrap ${
                          tx.direction === TransactionDirection.INFLOW ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {tx.direction === TransactionDirection.INFLOW ? '+' : '-'}
                        {fullMoney(tx.originalAmount, tx.originalCurrency)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filtered.length > visibleCount && (
            <div className="border-t border-gray-800 px-4 py-3 text-center">
              <button
                onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                Show more ({(filtered.length - visibleCount).toLocaleString()} remaining)
              </button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
