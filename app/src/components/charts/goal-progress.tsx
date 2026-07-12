'use client';

import { ProgressBar } from '@/components/ui/primitives';
import { fullMoney } from './common';

export interface GoalProgressItem {
  name: string;
  emoji: string | null;
  currency: string;
  targetAmount: number;
  savedAmount: number;
  progressPct: number;
  targetDate: string | null;
  requiredMonthlySaving: number | null;
}

export function GoalProgressList({ goals }: { goals: GoalProgressItem[] }) {
  if (goals.length === 0) {
    return <p className="text-sm text-gray-500 py-4">No savings goals yet.</p>;
  }
  return (
    <div className="space-y-4">
      {goals.map(goal => (
        <div key={goal.name}>
          <div className="flex items-baseline justify-between mb-1.5">
            <span className="text-sm text-gray-200">
              {goal.emoji ? `${goal.emoji} ` : ''}
              {goal.name}
            </span>
            <span className="text-xs text-gray-500 font-mono tabular-nums">
              {fullMoney(goal.savedAmount, goal.currency)} / {fullMoney(goal.targetAmount, goal.currency)}
            </span>
          </div>
          <ProgressBar
            value={goal.progressPct}
            barClassName={goal.progressPct >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}
          />
          <div className="flex items-center justify-between mt-1">
            <span className="text-[11px] text-gray-500">{goal.progressPct}% saved</span>
            {goal.requiredMonthlySaving !== null && goal.requiredMonthlySaving > 0 && goal.targetDate && (
              <span className="text-[11px] text-gray-500">
                {fullMoney(goal.requiredMonthlySaving, goal.currency)}/mo to hit {goal.targetDate}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
