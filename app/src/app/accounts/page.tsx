'use client';

import { useState, useEffect } from 'react';
import { Bank, Currency, AccountType, BANK_LABELS, Account } from '@/types';

const BANK_OPTIONS = Object.entries(BANK_LABELS).map(([value, label]) => ({ value, label }));
const CURRENCY_OPTIONS = Object.values(Currency);
const TYPE_OPTIONS = [
  { value: AccountType.CHECKING, label: 'Checking / Current' },
  { value: AccountType.SAVINGS, label: 'Savings' },
  { value: AccountType.CREDIT_CARD, label: 'Credit Card' },
  { value: AccountType.INVESTMENT, label: 'Investment' },
];

const BANK_DEFAULT_CURRENCIES: Partial<Record<Bank, Currency>> = {
  [Bank.BANK_OF_AMERICA]: Currency.USD,
  [Bank.CHASE]: Currency.USD,
  [Bank.LLOYDS]: Currency.GBP,
  [Bank.HSBC]: Currency.GBP,
  [Bank.QNB_FINANSBANK]: Currency.TRY,
  [Bank.REVOLUT]: Currency.GBP,
  [Bank.TRADING_212]: Currency.GBP,
};

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [bank, setBank] = useState<Bank>(Bank.BANK_OF_AMERICA);
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>(AccountType.CHECKING);
  const [currency, setCurrency] = useState<Currency>(Currency.USD);
  const [groupName, setGroupName] = useState('');

  // Snapshot fields
  const [snapshotAccountId, setSnapshotAccountId] = useState<number | null>(null);
  const [snapshotDate, setSnapshotDate] = useState('');
  const [snapshotBalance, setSnapshotBalance] = useState('');

  useEffect(() => {
    fetchAccounts();
  }, []);

  async function fetchAccounts() {
    const res = await fetch('/api/accounts');
    const data = await res.json();
    setAccounts(data);
  }

  async function handleAddAccount(e: React.FormEvent) {
    e.preventDefault();
    const accountName = name || `${BANK_LABELS[bank]} ${type}`;
    await fetch('/api/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bank,
        name: accountName,
        type,
        currency,
        groupName: groupName || null,
      }),
    });
    setShowForm(false);
    setName('');
    setGroupName('');
    fetchAccounts();
  }

  async function handleDeleteAccount(id: number) {
    if (!confirm('Delete this account and all its transactions?')) return;
    await fetch(`/api/accounts?id=${id}`, { method: 'DELETE' });
    fetchAccounts();
  }

  async function handleSetSnapshot(e: React.FormEvent) {
    e.preventDefault();
    if (!snapshotAccountId || !snapshotDate || !snapshotBalance) return;

    const account = accounts.find(a => a.id === snapshotAccountId);
    await fetch('/api/snapshots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accountId: snapshotAccountId,
        date: snapshotDate,
        balance: parseFloat(snapshotBalance),
        currency: account?.currency || Currency.USD,
        source: 'manual',
      }),
    });
    setSnapshotAccountId(null);
    setSnapshotDate('');
    setSnapshotBalance('');
    alert('Balance snapshot saved!');
  }

  function handleBankChange(newBank: Bank) {
    setBank(newBank);
    const defaultCurrency = BANK_DEFAULT_CURRENCIES[newBank];
    if (defaultCurrency) setCurrency(defaultCurrency);
    if (newBank === Bank.REVOLUT) setGroupName('Revolut');
    else setGroupName('');
    if (newBank === Bank.TRADING_212) setType(AccountType.INVESTMENT);
    else setType(AccountType.CHECKING);
  }

  // Group accounts by groupName
  const grouped = accounts.reduce<Record<string, Account[]>>((acc, a) => {
    const key = a.groupName || a.name;
    if (!acc[key]) acc[key] = [];
    acc[key].push(a);
    return acc;
  }, {});

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Accounts</h1>
          <p className="text-gray-400 text-sm mt-1">Manage your financial accounts</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
        >
          + Add Account
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAddAccount} className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Bank</label>
              <select
                value={bank}
                onChange={e => handleBankChange(e.target.value as Bank)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
              >
                {BANK_OPTIONS.map(b => (
                  <option key={b.value} value={b.value}>{b.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Account Type</label>
              <select
                value={type}
                onChange={e => setType(e.target.value as AccountType)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
              >
                {TYPE_OPTIONS.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Currency</label>
              <select
                value={currency}
                onChange={e => setCurrency(e.target.value as Currency)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
              >
                {CURRENCY_OPTIONS.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Account Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={`${BANK_LABELS[bank]} ${type}`}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500"
              />
            </div>
          </div>
          {bank === Bank.REVOLUT && (
            <div>
              <label className="block text-sm text-gray-400 mb-1">Group Name (for Revolut pockets)</label>
              <input
                type="text"
                value={groupName}
                onChange={e => setGroupName(e.target.value)}
                placeholder="Revolut"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500"
              />
            </div>
          )}
          <button
            type="submit"
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors"
          >
            Save Account
          </button>
        </form>
      )}

      {/* Account List */}
      <div className="space-y-3">
        {Object.entries(grouped).map(([group, accts]) => (
          <div key={group} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            {accts.length > 1 && (
              <div className="px-5 py-3 border-b border-gray-800 bg-gray-900/50">
                <span className="text-sm font-medium text-gray-300">{group}</span>
              </div>
            )}
            {accts.map(account => (
              <div key={account.id} className="px-5 py-4 flex items-center justify-between border-b border-gray-800/50 last:border-0">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center text-xs font-medium text-gray-400">
                    {account.currency}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">{account.name}</div>
                    <div className="text-xs text-gray-500">
                      {BANK_LABELS[account.bank as Bank]} &middot; {account.type}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setSnapshotAccountId(account.id);
                      setSnapshotDate(new Date().toISOString().slice(0, 10));
                    }}
                    className="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
                  >
                    Set Balance
                  </button>
                  <button
                    onClick={() => handleDeleteAccount(account.id)}
                    className="px-3 py-1.5 text-xs text-red-400 hover:bg-red-950 rounded-lg transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {accounts.length === 0 && (
        <div className="text-center py-16">
          <p className="text-gray-500">No accounts yet. Add your first account to get started.</p>
        </div>
      )}

      {/* Balance Snapshot Modal */}
      {snapshotAccountId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setSnapshotAccountId(null)}>
          <form
            onSubmit={handleSetSnapshot}
            onClick={e => e.stopPropagation()}
            className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-96 space-y-4"
          >
            <h3 className="text-lg font-semibold text-white">Set Balance Snapshot</h3>
            <p className="text-sm text-gray-400">
              For: {accounts.find(a => a.id === snapshotAccountId)?.name}
            </p>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Date</label>
              <input
                type="date"
                value={snapshotDate}
                onChange={e => setSnapshotDate(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Balance</label>
              <input
                type="number"
                step="0.01"
                value={snapshotBalance}
                onChange={e => setSnapshotBalance(e.target.value)}
                placeholder="e.g. 12500.00"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500"
                required
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
              >
                Save Snapshot
              </button>
              <button
                type="button"
                onClick={() => setSnapshotAccountId(null)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
