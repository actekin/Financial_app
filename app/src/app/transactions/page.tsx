'use client';

import { useState, useEffect } from 'react';
import { Account, Transaction, BANK_LABELS, Bank, AutoCategory, CATEGORY_LABELS, CATEGORY_COLORS, TransactionDirection } from '@/types';
import { fromCents } from '@/lib/utils/money';

export default function TransactionsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filterAccount, setFilterAccount] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/accounts').then(r => r.ok ? r.json() : []),
      fetch('/api/transactions').then(r => r.ok ? r.json() : []),
    ]).then(([accts, txns]) => {
      if (Array.isArray(accts)) setAccounts(accts);
      if (Array.isArray(txns)) setTransactions(txns);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const filtered = transactions.filter(tx => {
    if (filterAccount && tx.accountId !== parseInt(filterAccount)) return false;
    if (filterCategory && tx.autoCategory !== filterCategory) return false;
    return true;
  }).sort((a, b) => b.date.localeCompare(a.date));

  const accountMap = Object.fromEntries(accounts.map(a => [a.id, a]));
  const categories = [...new Set(transactions.map(t => t.autoCategory))].sort();

  async function updateCategory(id: number, autoCategory: string) {
    await fetch('/api/transactions', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, autoCategory }),
    });
    setTransactions(prev => prev.map(tx => tx.id === id ? { ...tx, autoCategory: autoCategory as AutoCategory } : tx));
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse text-gray-500">Loading transactions...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white mb-2">Transactions</h1>
      <p className="text-gray-400 text-sm mb-6">{transactions.length} total transactions across all accounts</p>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <select
          value={filterAccount}
          onChange={e => setFilterAccount(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
        >
          <option value="">All Accounts</option>
          {accounts.map(a => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
        >
          <option value="">All Categories</option>
          {categories.map(c => (
            <option key={c} value={c}>{CATEGORY_LABELS[c as AutoCategory] || c}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto max-h-[calc(100vh-250px)] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-800/50 sticky top-0">
              <tr>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Date</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Account</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Description</th>
                <th className="text-left px-4 py-3 text-gray-400 font-medium">Category</th>
                <th className="text-right px-4 py-3 text-gray-400 font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 500).map(tx => {
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
                        className="bg-transparent text-xs px-2 py-1 rounded border border-gray-700 hover:border-gray-600"
                        style={{ color: CATEGORY_COLORS[cat] || '#9ca3af' }}
                      >
                        {Object.values(AutoCategory).map(c => (
                          <option key={c} value={c} className="bg-gray-900 text-gray-300">
                            {CATEGORY_LABELS[c]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className={`px-4 py-2.5 text-right font-mono tabular-nums whitespace-nowrap ${
                      tx.direction === TransactionDirection.INFLOW ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {tx.direction === TransactionDirection.INFLOW ? '+' : '-'}
                      {fromCents(tx.originalAmount).toFixed(2)} {tx.originalCurrency}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No transactions found.</p>
        </div>
      )}
    </div>
  );
}
