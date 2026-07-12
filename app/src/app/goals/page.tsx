'use client';

import { useCallback, useEffect, useState } from 'react';
import { Account, Currency, GoalWithProgress } from '@/types';
import { fromCents } from '@/lib/utils/money';
import { fullMoney } from '@/components/charts/common';
import { Card } from '@/components/ui/card';
import { Button, EmptyState, PageHeader, ProgressBar, Skeleton, inputClass, selectClass } from '@/components/ui/primitives';
import { Target, Plus, Pencil, Trash2, PiggyBank, CalendarClock, Link2 } from 'lucide-react';

interface GoalFormState {
  id: number | null;
  name: string;
  emoji: string;
  targetAmount: string;
  savedAmount: string;
  currency: Currency;
  targetDate: string;
  linkedAccountId: string;
  notes: string;
}

const EMPTY_FORM: GoalFormState = {
  id: null,
  name: '',
  emoji: '',
  targetAmount: '',
  savedAmount: '',
  currency: Currency.GBP,
  targetDate: '',
  linkedAccountId: '',
  notes: '',
};

export default function GoalsPage() {
  const [goals, setGoals] = useState<GoalWithProgress[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<GoalFormState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [contributingId, setContributingId] = useState<number | null>(null);
  const [contribution, setContribution] = useState('');

  const refresh = useCallback(async () => {
    try {
      const [goalsRes, accountsRes] = await Promise.all([
        fetch('/api/goals'),
        fetch('/api/accounts'),
      ]);
      if (goalsRes.ok) setGoals(await goalsRes.json());
      if (accountsRes.ok) {
        const data = await accountsRes.json();
        if (Array.isArray(data)) setAccounts(data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  function openCreate() {
    setError(null);
    setForm({ ...EMPTY_FORM, currency: (accounts[0]?.currency as Currency) || Currency.GBP });
  }

  function openEdit(goal: GoalWithProgress) {
    setError(null);
    setForm({
      id: goal.id,
      name: goal.name,
      emoji: goal.emoji || '',
      targetAmount: String(fromCents(goal.targetAmount)),
      savedAmount: goal.linkedAccountId ? '' : String(fromCents(goal.savedAmount)),
      currency: goal.currency,
      targetDate: goal.targetDate || '',
      linkedAccountId: goal.linkedAccountId ? String(goal.linkedAccountId) : '',
      notes: goal.notes || '',
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setError(null);

    const payload: Record<string, unknown> = {
      name: form.name,
      emoji: form.emoji || null,
      targetAmount: parseFloat(form.targetAmount),
      currency: form.currency,
      targetDate: form.targetDate || null,
      linkedAccountId: form.linkedAccountId ? parseInt(form.linkedAccountId) : null,
      notes: form.notes || null,
    };
    if (!form.linkedAccountId && form.savedAmount !== '') {
      payload.savedAmount = parseFloat(form.savedAmount) || 0;
    }

    const res = form.id
      ? await fetch(`/api/goals/${form.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      : await fetch('/api/goals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Could not save the goal');
      return;
    }
    setForm(null);
    refresh();
  }

  async function handleDelete(goal: GoalWithProgress) {
    if (!confirm(`Delete the goal "${goal.name}"?`)) return;
    await fetch(`/api/goals/${goal.id}`, { method: 'DELETE' });
    refresh();
  }

  async function handleContribute(goal: GoalWithProgress) {
    const amount = parseFloat(contribution);
    if (!Number.isFinite(amount) || amount === 0) return;
    await fetch(`/api/goals/${goal.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ addContribution: amount }),
    });
    setContributingId(null);
    setContribution('');
    refresh();
  }

  const accountName = (id: number | null) => accounts.find(a => a.id === id)?.name;

  return (
    <div className="p-4 md:p-8 max-w-5xl">
      <PageHeader
        title="Savings Goals"
        subtitle="Set targets together and watch them fill up"
        actions={
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4" /> New Goal
          </Button>
        }
      />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-44" />
          <Skeleton className="h-44" />
        </div>
      ) : goals.length === 0 ? (
        <Card>
          <EmptyState
            icon={Target}
            title="No goals yet"
            description="Create your first savings goal — a house deposit, a holiday, an emergency fund — and track progress together."
            action={
              <Button onClick={openCreate}>
                <Plus className="w-4 h-4" /> Create a goal
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {goals.map(goal => {
            const done = goal.progressPct >= 100;
            return (
              <Card key={goal.id} className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center text-lg">
                      {goal.emoji || <PiggyBank className="w-5 h-5 text-gray-500" />}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white">{goal.name}</h3>
                      <p className="text-xs text-gray-500">
                        {fullMoney(goal.savedAmount, goal.currency)} of {fullMoney(goal.targetAmount, goal.currency)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(goal)} className="p-1.5 text-gray-500 hover:text-gray-300 rounded-lg hover:bg-gray-800" title="Edit">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(goal)} className="p-1.5 text-gray-500 hover:text-red-400 rounded-lg hover:bg-gray-800" title="Delete">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <ProgressBar
                  value={goal.progressPct}
                  className="h-2.5"
                  barClassName={done ? 'bg-emerald-500' : 'bg-blue-500'}
                />
                <div className="flex items-center justify-between mt-1.5 mb-3">
                  <span className={`text-xs font-medium ${done ? 'text-emerald-400' : 'text-blue-400'}`}>
                    {goal.progressPct}%{done ? ' — done! 🎉' : ''}
                  </span>
                  <span className="text-xs text-gray-500 font-mono tabular-nums">
                    {fullMoney(goal.remainingAmount, goal.currency)} to go
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-gray-500">
                  {goal.targetDate && (
                    <div className="flex items-center gap-1.5">
                      <CalendarClock className="w-3.5 h-3.5" />
                      Target {goal.targetDate}
                      {goal.requiredMonthlySaving !== null && goal.requiredMonthlySaving > 0 && (
                        <span className="text-gray-400">
                          — save {fullMoney(goal.requiredMonthlySaving, goal.currency)}/month
                        </span>
                      )}
                    </div>
                  )}
                  {goal.linkedAccountId && (
                    <div className="flex items-center gap-1.5">
                      <Link2 className="w-3.5 h-3.5" />
                      Tracks {accountName(goal.linkedAccountId) || `account #${goal.linkedAccountId}`} automatically
                    </div>
                  )}
                </div>

                {!goal.linkedAccountId && (
                  <div className="mt-4 pt-3 border-t border-gray-800/70">
                    {contributingId === goal.id ? (
                      <form
                        onSubmit={e => {
                          e.preventDefault();
                          handleContribute(goal);
                        }}
                        className="flex items-center gap-2"
                      >
                        <input
                          type="number"
                          step="0.01"
                          autoFocus
                          value={contribution}
                          onChange={e => setContribution(e.target.value)}
                          placeholder="Amount"
                          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500"
                        />
                        <Button type="submit" className="px-3 py-1.5">Add</Button>
                        <Button type="button" variant="ghost" className="px-2 py-1.5" onClick={() => setContributingId(null)}>
                          Cancel
                        </Button>
                      </form>
                    ) : (
                      <Button
                        variant="secondary"
                        className="w-full py-1.5 text-xs"
                        onClick={() => {
                          setContributingId(goal.id);
                          setContribution('');
                        }}
                      >
                        <Plus className="w-3.5 h-3.5" /> Add contribution
                      </Button>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Create / edit modal */}
      {form && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setForm(null)}>
          <form
            onSubmit={handleSubmit}
            onClick={e => e.stopPropagation()}
            className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <h3 className="text-lg font-semibold text-white">{form.id ? 'Edit goal' : 'New savings goal'}</h3>

            <div className="grid grid-cols-[1fr_88px] gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Name</label>
                <input
                  className={inputClass}
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="House deposit"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Emoji</label>
                <input
                  className={inputClass}
                  value={form.emoji}
                  onChange={e => setForm({ ...form, emoji: e.target.value })}
                  placeholder="🏡"
                  maxLength={4}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Target amount</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  className={inputClass}
                  value={form.targetAmount}
                  onChange={e => setForm({ ...form, targetAmount: e.target.value })}
                  placeholder="20000"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Currency</label>
                <select
                  className={selectClass}
                  value={form.currency}
                  onChange={e => setForm({ ...form, currency: e.target.value as Currency })}
                >
                  {Object.values(Currency).map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Track progress</label>
              <select
                className={selectClass}
                value={form.linkedAccountId}
                onChange={e => setForm({ ...form, linkedAccountId: e.target.value })}
              >
                <option value="">Manually (log contributions)</option>
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>Follow balance of: {a.name}</option>
                ))}
              </select>
            </div>

            {!form.linkedAccountId && (
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Already saved (optional)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className={inputClass}
                  value={form.savedAmount}
                  onChange={e => setForm({ ...form, savedAmount: e.target.value })}
                  placeholder="0"
                />
              </div>
            )}

            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Target date (optional)</label>
              <input
                type="date"
                className={inputClass}
                value={form.targetDate}
                onChange={e => setForm({ ...form, targetDate: e.target.value })}
              />
            </div>

            {error && (
              <p className="text-sm text-red-400 bg-red-950/40 border border-red-900/50 rounded-lg px-3 py-2">{error}</p>
            )}

            <div className="flex gap-3 pt-1">
              <Button type="submit" className="flex-1">{form.id ? 'Save changes' : 'Create goal'}</Button>
              <Button type="button" variant="secondary" onClick={() => setForm(null)}>Cancel</Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
