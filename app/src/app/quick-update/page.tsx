'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Account, getBankLabel } from '@/types';
import { fromCents } from '@/lib/utils/money';
import { CheckCircle, Upload, Zap } from 'lucide-react';

interface FreshnessEntry {
  account: Account;
  latestSnapshot: {
    date: string;
    balance: number;
    currency: string;
    source: string;
    updatedBy: string | null;
    updatedAt: string | null;
  } | null;
  lastTransactionDate: string | null;
  transactionCount: number;
  lastUpload: { uploadedAt: string; filename: string; uploadedBy: string | null } | null;
  lastDataDate: string | null;
}

function daysAgo(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const then = new Date(dateStr.slice(0, 10) + 'T00:00:00');
  if (isNaN(then.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - then.getTime()) / 86_400_000));
}

function FreshnessBadge({ lastDataDate }: { lastDataDate: string | null }) {
  const age = daysAgo(lastDataDate);
  if (age === null) {
    return <span className="inline-block px-2 py-0.5 rounded text-xs bg-red-950 text-red-400">No data yet</span>;
  }
  if (age <= 7) {
    return <span className="inline-block px-2 py-0.5 rounded text-xs bg-green-950 text-green-400">Up to date · {age === 0 ? 'today' : `${age}d ago`}</span>;
  }
  if (age <= 30) {
    return <span className="inline-block px-2 py-0.5 rounded text-xs bg-yellow-950 text-yellow-400">Getting stale · {age}d ago</span>;
  }
  return <span className="inline-block px-2 py-0.5 rounded text-xs bg-red-950 text-red-400">Stale · {age}d ago</span>;
}

export default function QuickUpdatePage() {
  const [entries, setEntries] = useState<FreshnessEntry[]>([]);
  const [balances, setBalances] = useState<Record<number, string>>({});
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFreshness();
  }, []);

  async function fetchFreshness() {
    setLoading(true);
    try {
      const res = await fetch('/api/freshness');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setEntries(data);
      }
    } catch {
      // leave entries empty; the empty state below handles it
    } finally {
      setLoading(false);
    }
  }

  const filledEntries = entries.filter(
    e => balances[e.account.id] !== undefined && balances[e.account.id].trim() !== ''
  );

  async function handleSaveAll() {
    if (filledEntries.length === 0) return;
    setSaving(true);
    setError(null);
    setSavedCount(null);
    try {
      const res = await fetch('/api/snapshots/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          snapshots: filledEntries.map(e => ({
            accountId: e.account.id,
            date,
            balance: parseFloat(balances[e.account.id]),
            currency: e.account.currency,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to save balances.');
        return;
      }
      setSavedCount(data.saved);
      setBalances({});
      await fetchFreshness();
    } catch {
      setError('Failed to save balances. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-400" /> Quick Update
        </h1>
      </div>
      <p className="text-gray-400 text-sm mb-8">
        Check in current balances for all accounts in one go. For transaction-level detail,{' '}
        <Link href="/upload" className="text-blue-400 hover:underline">upload statements</Link> —
        re-uploading overlapping files is safe, duplicates are skipped automatically.
      </p>

      {loading ? (
        <p className="text-gray-500 animate-pulse">Loading accounts...</p>
      ) : entries.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500">
            No accounts yet.{' '}
            <Link href="/accounts" className="text-blue-400 hover:underline">Add accounts</Link> to get started.
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-end justify-between mb-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Balances as of</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white"
              />
            </div>
            <button
              onClick={handleSaveAll}
              disabled={saving || filledEntries.length === 0}
              className="px-5 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm rounded-lg transition-colors"
            >
              {saving
                ? 'Saving...'
                : filledEntries.length > 0
                  ? `Save ${filledEntries.length} Balance${filledEntries.length > 1 ? 's' : ''}`
                  : 'Enter balances to save'}
            </button>
          </div>

          {savedCount !== null && (
            <div className="mb-4 bg-green-950/30 border border-green-900 rounded-xl p-4 flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
              <p className="text-sm text-green-300">{savedCount} balance{savedCount !== 1 ? 's' : ''} saved.</p>
            </div>
          )}
          {error && (
            <div className="mb-4 bg-red-950/30 border border-red-900 rounded-xl p-4">
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-800/50">
                <tr>
                  <th className="text-left px-5 py-3 text-gray-400 font-medium">Account</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Freshness</th>
                  <th className="text-right px-4 py-3 text-gray-400 font-medium">Last Known Balance</th>
                  <th className="text-right px-5 py-3 text-gray-400 font-medium">New Balance</th>
                </tr>
              </thead>
              <tbody>
                {entries.map(entry => {
                  const { account, latestSnapshot, lastTransactionDate } = entry;
                  return (
                    <tr key={account.id} className="border-t border-gray-800/50">
                      <td className="px-5 py-3">
                        <div className="text-white">{account.name}</div>
                        <div className="text-xs text-gray-500">
                          {getBankLabel(account.bank)} · {account.currency}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <FreshnessBadge lastDataDate={entry.lastDataDate} />
                        <div className="text-xs text-gray-600 mt-1">
                          {latestSnapshot
                            ? `Balance set ${latestSnapshot.date}${latestSnapshot.updatedBy ? ` by ${latestSnapshot.updatedBy}` : ''}`
                            : 'No balance set yet'}
                          {lastTransactionDate && ` · last txn ${lastTransactionDate}`}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-gray-300">
                        {latestSnapshot
                          ? `${fromCents(latestSnapshot.balance).toLocaleString(undefined, { minimumFractionDigits: 2 })} ${latestSnapshot.currency}`
                          : '—'}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={balances[account.id] ?? ''}
                          onChange={e =>
                            setBalances(prev => ({ ...prev, [account.id]: e.target.value }))
                          }
                          placeholder={
                            latestSnapshot ? fromCents(latestSnapshot.balance).toFixed(2) : '0.00'
                          }
                          className="w-36 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white text-right font-mono placeholder-gray-600"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex items-center gap-2 text-sm text-gray-500">
            <Upload className="w-4 h-4" />
            <span>
              Got new statements too?{' '}
              <Link href="/upload" className="text-blue-400 hover:underline">Upload them</Link>{' '}
              — you can drop multiple files at once.
            </span>
          </div>
        </>
      )}
    </div>
  );
}
