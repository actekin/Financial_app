'use client';

import { useEffect, useRef, useState } from 'react';
import { FinancialContext } from '@/lib/advisor/analysis';
import { Card, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/primitives';
import { MonthlyTrendChart } from '@/components/charts/monthly-trend';
import { IncomeSpendingChart } from '@/components/charts/income-spending';
import { CategoryCompareChart } from '@/components/charts/category-compare';
import { CashPositionChart } from '@/components/charts/cash-position';
import { GoalProgressList } from '@/components/charts/goal-progress';
import { fullMoney } from '@/components/charts/common';
import { Sparkles, SendHorizonal, CircleCheck, CircleX, CircleAlert, Info } from 'lucide-react';

type Verdict = 'yes' | 'no' | 'caution' | 'info';

interface Advice {
  verdict: Verdict;
  headline: string;
  reasoning: string;
  chartKeys: string[];
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string; // user question, or assistant reasoning text
  advice?: Advice;
  context?: FinancialContext;
  isError?: boolean;
}

const SUGGESTIONS = [
  'Can we afford a £300 weekend away this month?',
  'Is it OK to pay extra for the business class ticket?',
  'How are we tracking against our savings goals?',
  'Where are we overspending compared to normal?',
];

const VERDICT_STYLE: Record<Verdict, { label: string; className: string; icon: typeof CircleCheck }> = {
  yes: { label: 'Go for it', className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', icon: CircleCheck },
  no: { label: 'Hold off', className: 'bg-red-500/15 text-red-400 border-red-500/30', icon: CircleX },
  caution: { label: 'Possible, but tight', className: 'bg-amber-500/15 text-amber-400 border-amber-500/30', icon: CircleAlert },
  info: { label: 'For your info', className: 'bg-blue-500/15 text-blue-400 border-blue-500/30', icon: Info },
};

function AdviceCharts({ chartKeys, context }: { chartKeys: string[]; context: FinancialContext }) {
  const currency = context.primaryCurrency;
  return (
    <div className="grid gap-3 mt-3">
      {chartKeys.map(key => {
        switch (key) {
          case 'monthly_trend':
            return (
              <Card key={key} className="p-4">
                <p className="text-xs font-medium text-gray-400 mb-2">Monthly spending vs average ({currency})</p>
                <MonthlyTrendChart
                  data={context.monthly}
                  average={context.currentMonth.avgMonthlySpending}
                  currency={currency}
                  currentMonth={context.currentMonth.month}
                  height={190}
                />
              </Card>
            );
          case 'income_vs_spending':
            return (
              <Card key={key} className="p-4">
                <p className="text-xs font-medium text-gray-400 mb-2">Income vs spending ({currency})</p>
                <IncomeSpendingChart data={context.monthly} currency={currency} height={190} />
              </Card>
            );
          case 'category_compare':
            return (
              <Card key={key} className="p-4">
                <p className="text-xs font-medium text-gray-400 mb-2">This month vs monthly average, by category</p>
                <CategoryCompareChart data={context.categories} currency={currency} maxCategories={6} />
              </Card>
            );
          case 'cash_position':
            return (
              <Card key={key} className="p-4">
                <p className="text-xs font-medium text-gray-400 mb-2">Cash position by account</p>
                <CashPositionChart accounts={context.cash.accounts} />
              </Card>
            );
          case 'goal_progress':
            return (
              <Card key={key} className="p-4">
                <p className="text-xs font-medium text-gray-400 mb-2">Savings goals</p>
                <GoalProgressList goals={context.goals} />
              </Card>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}

export default function AdvisorPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [snapshot, setSnapshot] = useState<FinancialContext | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/advisor/context')
      .then(r => (r.ok ? r.json() : null))
      .then(data => setSnapshot(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function ask(question: string) {
    const q = question.trim();
    if (!q || loading) return;
    setInput('');
    setLoading(true);

    const history = messages
      .filter(m => !m.isError)
      .map(m => ({
        role: m.role,
        content: m.role === 'assistant' && m.advice ? `${m.advice.headline} ${m.advice.reasoning}` : m.content,
      }));

    setMessages(prev => [...prev, { role: 'user', content: q }]);

    try {
      const res = await fetch('/api/advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, history }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessages(prev => [
          ...prev,
          { role: 'assistant', content: data.error || 'Something went wrong.', isError: true, context: data.context },
        ]);
        return;
      }

      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: data.advice.reasoning, advice: data.advice, context: data.context },
      ]);
      if (data.context) setSnapshot(data.context);
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Could not reach the advisor. Check your connection and try again.', isError: true },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const cm = snapshot?.currentMonth;
  const currency = snapshot?.primaryCurrency || 'GBP';
  const hasChat = messages.length > 0;

  return (
    <div className="flex flex-col h-[calc(100dvh-0px)]">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 md:px-8 py-6 md:py-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center">
              <Sparkles className="w-4.5 h-4.5 text-violet-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Advisor</h1>
              <p className="text-xs text-gray-500">Ask anything about your money — answers use your live data</p>
            </div>
          </div>

          {/* Live snapshot strip */}
          {cm && (
            <div className="flex flex-wrap gap-2 mt-4 mb-6">
              {Object.entries(snapshot!.cash.totalByCurrency).map(([cur, total]) => (
                <span key={cur} className="text-xs bg-gray-900 border border-gray-800 rounded-full px-3 py-1.5 text-gray-300">
                  Cash: <span className="font-medium text-white">{fullMoney(total, cur)}</span>
                </span>
              ))}
              <span className="text-xs bg-gray-900 border border-gray-800 rounded-full px-3 py-1.5 text-gray-300">
                Spent this month: <span className="font-medium text-white">{fullMoney(cm.spending, currency)}</span>
              </span>
              {cm.spendingVsAvgPct !== null && (
                <span
                  className={`text-xs border rounded-full px-3 py-1.5 font-medium ${
                    cm.spendingVsAvgPct <= 0
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                  }`}
                >
                  Tracking {cm.spendingVsAvgPct > 0 ? '+' : ''}
                  {cm.spendingVsAvgPct}% vs average
                </span>
              )}
            </div>
          )}

          {!hasChat && (
            <div className="mt-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Try asking</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => ask(s)}
                    className="text-left text-sm text-gray-300 bg-gray-900 border border-gray-800 hover:border-gray-700 hover:bg-gray-800/60 rounded-xl px-4 py-3 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>

              {snapshot && snapshot.monthly.some(m => m.spending > 0) && (
                <Card className="mt-6">
                  <CardHeader title={`Monthly spending (${currency})`} subtitle="Dashed line = trailing 12-month average" />
                  <div className="px-4 pb-4">
                    <MonthlyTrendChart
                      data={snapshot.monthly}
                      average={snapshot.currentMonth.avgMonthlySpending}
                      currency={currency}
                      currentMonth={snapshot.currentMonth.month}
                    />
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* Conversation */}
          <div className="space-y-5 mt-2">
            {messages.map((msg, i) =>
              msg.role === 'user' ? (
                <div key={i} className="flex justify-end">
                  <div className="bg-blue-600 text-white text-sm rounded-2xl rounded-br-md px-4 py-2.5 max-w-[85%]">
                    {msg.content}
                  </div>
                </div>
              ) : (
                <div key={i} className="max-w-full">
                  {msg.isError ? (
                    <div className="bg-amber-950/40 border border-amber-900/50 text-amber-300 text-sm rounded-2xl px-4 py-3">
                      {msg.content}
                    </div>
                  ) : (
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl rounded-bl-md px-4 py-3.5">
                      {msg.advice && (
                        <>
                          {(() => {
                            const v = VERDICT_STYLE[msg.advice.verdict] || VERDICT_STYLE.info;
                            const Icon = v.icon;
                            return (
                              <span className={`inline-flex items-center gap-1.5 text-xs font-medium border rounded-full px-2.5 py-1 mb-2.5 ${v.className}`}>
                                <Icon className="w-3.5 h-3.5" /> {v.label}
                              </span>
                            );
                          })()}
                          <p className="text-sm font-semibold text-white mb-1.5">{msg.advice.headline}</p>
                        </>
                      )}
                      <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  )}
                  {msg.advice && msg.context && msg.advice.chartKeys?.length > 0 && (
                    <AdviceCharts chartKeys={msg.advice.chartKeys} context={msg.context} />
                  )}
                </div>
              )
            )}

            {loading && (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl rounded-bl-md px-4 py-3.5 inline-flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-violet-400 animate-pulse" />
                <span className="text-sm text-gray-400">Analysing your finances…</span>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>
      </div>

      {/* Composer */}
      <div className="border-t border-gray-800 bg-gray-950/90 backdrop-blur">
        <form
          onSubmit={e => {
            e.preventDefault();
            ask(input);
          }}
          className="max-w-3xl mx-auto px-4 md:px-8 py-4 flex items-center gap-3"
        >
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="e.g. Does a £100 upgrade make sense this month?"
            className="flex-1 bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20"
          />
          <Button type="submit" disabled={loading || !input.trim()} className="px-4 py-3">
            <SendHorizonal className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
