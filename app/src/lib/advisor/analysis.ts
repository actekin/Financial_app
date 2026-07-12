import { db } from '@/lib/db/client';
import { Account, Currency, Goal, GoalWithProgress, CATEGORY_LABELS, AutoCategory } from '@/types';

// All amounts in this module are integer cents in the transaction's original
// currency. There is no FX conversion yet, so aggregates are computed per
// currency and a "primary" currency (largest spending volume) is used for the
// headline series.

export interface AccountBalance {
  account: Account;
  balance: number; // cents
  asOf: string; // date of the underlying snapshot, or 'inferred'
}

export interface MonthlyPoint {
  month: string; // YYYY-MM
  income: number;
  spending: number;
  net: number;
}

export interface CategoryComparison {
  category: string;
  label: string;
  thisMonth: number;
  monthlyAverage: number;
}

export interface FinancialContext {
  generatedAt: string;
  primaryCurrency: Currency;
  currencies: string[];
  cash: {
    totalByCurrency: Record<string, number>;
    accounts: Array<{
      id: number;
      name: string;
      bank: string;
      type: string;
      currency: string;
      balance: number;
    }>;
  };
  monthly: MonthlyPoint[]; // last 12 full months + current month, primary currency
  currentMonth: {
    month: string;
    spending: number;
    income: number;
    dayOfMonth: number;
    daysInMonth: number;
    projectedSpending: number;
    avgMonthlySpending: number; // trailing 12 months, excluding current
    avgMonthlyIncome: number;
    avgSpendingToSameDay: number; // past months' average spend by this day of month
    spendingVsAvgPct: number | null; // to-date vs typical to-date, e.g. -20 means 20% under
  };
  categories: CategoryComparison[]; // top categories, primary currency
  largestExpensesThisMonth: Array<{ date: string; description: string; amount: number; category: string }>;
  goals: Array<{
    name: string;
    emoji: string | null;
    currency: string;
    targetAmount: number;
    savedAmount: number;
    progressPct: number;
    targetDate: string | null;
    requiredMonthlySaving: number | null;
  }>;
}

function shiftMonth(key: string, delta: number): string {
  const [y, m] = key.split('-').map(Number);
  const idx = y * 12 + (m - 1) + delta;
  const ny = Math.floor(idx / 12);
  const nm = (idx % 12) + 1;
  return `${ny}-${String(nm).padStart(2, '0')}`;
}

export async function getAccountBalances(): Promise<AccountBalance[]> {
  const accounts = (await db.all('SELECT * FROM accounts ORDER BY id')) as unknown as Account[];
  const results: AccountBalance[] = [];

  for (const account of accounts) {
    const snapshot = await db.get(
      'SELECT date, balance FROM snapshots WHERE account_id = ? ORDER BY date DESC, id DESC LIMIT 1',
      [account.id]
    );
    const snapDate = (snapshot?.date as string) || '0000-00-00';
    const snapBalance = (snapshot?.balance as number) || 0;

    const flows = await db.get(
      `SELECT COALESCE(SUM(CASE WHEN direction = 'inflow' THEN original_amount ELSE -original_amount END), 0) AS flow
       FROM transactions WHERE account_id = ? AND date > ?`,
      [account.id, snapDate]
    );
    const flow = (flows?.flow as number) || 0;

    results.push({
      account,
      balance: snapBalance + flow,
      asOf: snapshot ? snapDate : 'inferred',
    });
  }

  return results;
}

export async function getGoalsWithProgress(): Promise<GoalWithProgress[]> {
  const goals = (await db.all('SELECT * FROM goals ORDER BY created_at')) as unknown as Goal[];
  if (goals.length === 0) return [];

  const balances = await getAccountBalances();
  const balanceByAccount = new Map(balances.map(b => [b.account.id, b.balance]));

  return goals.map(goal => {
    const saved = goal.linkedAccountId
      ? Math.max(balanceByAccount.get(goal.linkedAccountId) ?? 0, 0)
      : goal.savedAmount;

    const remaining = Math.max(goal.targetAmount - saved, 0);
    const progressPct = goal.targetAmount > 0
      ? Math.min(Math.round((saved / goal.targetAmount) * 1000) / 10, 100)
      : 0;

    let monthsLeft: number | null = null;
    let requiredMonthlySaving: number | null = null;
    if (goal.targetDate) {
      const now = new Date();
      const target = new Date(`${goal.targetDate}T00:00:00`);
      const days = (target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      monthsLeft = Math.max(Math.round((days / 30.44) * 10) / 10, 0);
      requiredMonthlySaving = remaining === 0
        ? 0
        : monthsLeft > 0.1
          ? Math.round(remaining / monthsLeft)
          : remaining;
    }

    return { ...goal, savedAmount: saved, progressPct, remainingAmount: remaining, monthsLeft, requiredMonthlySaving };
  });
}

export async function buildFinancialContext(): Promise<FinancialContext> {
  const now = new Date();
  const currentMonthKey = now.toISOString().slice(0, 7);
  const startKey = shiftMonth(currentMonthKey, -12); // 12 full months back
  const startDate = `${startKey}-01`;

  // Monthly income/spending per currency (transfers + excluded rows ignored)
  const rows = await db.all(
    `SELECT substr(date, 1, 7) AS month, original_currency AS currency, direction,
            SUM(original_amount) AS total
     FROM transactions
     WHERE date >= ? AND exclude_from_flow = 0 AND is_transfer = 0
     GROUP BY month, currency, direction`,
    [startDate]
  );

  // Primary currency = largest spending volume in the window
  const spendByCurrency: Record<string, number> = {};
  for (const r of rows) {
    if (r.direction === 'outflow') {
      const cur = r.currency as string;
      spendByCurrency[cur] = (spendByCurrency[cur] || 0) + (r.total as number);
    }
  }
  const accountsAll = (await db.all('SELECT * FROM accounts')) as unknown as Account[];
  const primaryCurrency = (Object.entries(spendByCurrency).sort((a, b) => b[1] - a[1])[0]?.[0] ||
    accountsAll[0]?.currency ||
    'USD') as Currency;

  // Build a continuous monthly series for the primary currency
  const byMonth: Record<string, { income: number; spending: number }> = {};
  for (let i = 12; i >= 0; i--) {
    byMonth[shiftMonth(currentMonthKey, -i)] = { income: 0, spending: 0 };
  }
  for (const r of rows) {
    if (r.currency !== primaryCurrency) continue;
    const bucket = byMonth[r.month as string];
    if (!bucket) continue;
    if (r.direction === 'inflow') bucket.income += r.total as number;
    else bucket.spending += r.total as number;
  }
  const monthly: MonthlyPoint[] = Object.entries(byMonth).map(([month, v]) => ({
    month,
    income: v.income,
    spending: v.spending,
    net: v.income - v.spending,
  }));

  // Current month vs trailing average (months with any activity, excluding current)
  const past = monthly.filter(m => m.month !== currentMonthKey && (m.income > 0 || m.spending > 0));
  const avgMonthlySpending = past.length > 0
    ? Math.round(past.reduce((s, m) => s + m.spending, 0) / past.length)
    : 0;
  const avgMonthlyIncome = past.length > 0
    ? Math.round(past.reduce((s, m) => s + m.income, 0) / past.length)
    : 0;

  const current = monthly.find(m => m.month === currentMonthKey) || { income: 0, spending: 0 };
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  // Compare against what a typical month looked like BY THIS DAY, not a naive
  // daily-pace extrapolation — otherwise front-loaded bills (rent on the 1st)
  // make every early-month reading look like a blowout.
  const toDayRow = await db.get(
    `SELECT COUNT(DISTINCT substr(date, 1, 7)) AS months, COALESCE(SUM(original_amount), 0) AS total
     FROM transactions
     WHERE date >= ? AND substr(date, 1, 7) != ? AND CAST(substr(date, 9, 2) AS INTEGER) <= ?
       AND direction = 'outflow' AND exclude_from_flow = 0 AND is_transfer = 0
       AND original_currency = ?`,
    [startDate, currentMonthKey, dayOfMonth, primaryCurrency]
  );
  const pastMonthCount = Math.max((toDayRow?.months as number) || 0, 1);
  const avgSpendingToSameDay = Math.round(((toDayRow?.total as number) || 0) / pastMonthCount);

  const spendingVsAvgPct = avgSpendingToSameDay > 0
    ? Math.round(((current.spending - avgSpendingToSameDay) / avgSpendingToSameDay) * 100)
    : null;
  // Seasonal projection: scale the typical full month by how this month is
  // tracking so far (falls back to plain daily pace with no history).
  const projectedSpending = avgSpendingToSameDay > 0 && avgMonthlySpending > 0
    ? Math.round(avgMonthlySpending * (current.spending / avgSpendingToSameDay))
    : dayOfMonth > 0
      ? Math.round((current.spending / dayOfMonth) * daysInMonth)
      : current.spending;

  // Category comparison: this month vs monthly average (primary currency)
  const catRows = await db.all(
    `SELECT auto_category AS category, substr(date, 1, 7) AS month, SUM(original_amount) AS total
     FROM transactions
     WHERE date >= ? AND direction = 'outflow' AND exclude_from_flow = 0 AND is_transfer = 0
       AND original_currency = ?
     GROUP BY category, month`,
    [startDate, primaryCurrency]
  );
  const catTotals: Record<string, { thisMonth: number; pastTotal: number; pastMonths: Set<string> }> = {};
  for (const r of catRows) {
    const cat = r.category as string;
    if (!catTotals[cat]) catTotals[cat] = { thisMonth: 0, pastTotal: 0, pastMonths: new Set() };
    if (r.month === currentMonthKey) {
      catTotals[cat].thisMonth += r.total as number;
    } else {
      catTotals[cat].pastTotal += r.total as number;
      catTotals[cat].pastMonths.add(r.month as string);
    }
  }
  const monthsInWindow = Math.max(past.length, 1);
  const categories: CategoryComparison[] = Object.entries(catTotals)
    .map(([category, v]) => ({
      category,
      label: CATEGORY_LABELS[category as AutoCategory] || category,
      thisMonth: v.thisMonth,
      monthlyAverage: Math.round(v.pastTotal / monthsInWindow),
    }))
    .sort((a, b) => (b.thisMonth + b.monthlyAverage) - (a.thisMonth + a.monthlyAverage))
    .slice(0, 10);

  // Largest expenses this month (context for "can I afford X" questions)
  const largest = await db.all(
    `SELECT date, description, original_amount AS amount, auto_category AS category
     FROM transactions
     WHERE substr(date, 1, 7) = ? AND direction = 'outflow'
       AND exclude_from_flow = 0 AND is_transfer = 0 AND original_currency = ?
     ORDER BY original_amount DESC LIMIT 5`,
    [currentMonthKey, primaryCurrency]
  );

  const balances = await getAccountBalances();
  const totalByCurrency: Record<string, number> = {};
  for (const b of balances) {
    totalByCurrency[b.account.currency] = (totalByCurrency[b.account.currency] || 0) + b.balance;
  }

  const goals = await getGoalsWithProgress();

  return {
    generatedAt: now.toISOString(),
    primaryCurrency,
    currencies: [...new Set(balances.map(b => b.account.currency as string))],
    cash: {
      totalByCurrency,
      accounts: balances.map(b => ({
        id: b.account.id,
        name: b.account.name,
        bank: b.account.bank,
        type: b.account.type,
        currency: b.account.currency,
        balance: b.balance,
      })),
    },
    monthly,
    currentMonth: {
      month: currentMonthKey,
      spending: current.spending,
      income: current.income,
      dayOfMonth,
      daysInMonth,
      projectedSpending,
      avgMonthlySpending,
      avgMonthlyIncome,
      avgSpendingToSameDay,
      spendingVsAvgPct,
    },
    categories,
    largestExpensesThisMonth: largest.map(r => ({
      date: r.date as string,
      description: r.description as string,
      amount: r.amount as number,
      category: r.category as string,
    })),
    goals: goals.map(g => ({
      name: g.name,
      emoji: g.emoji,
      currency: g.currency,
      targetAmount: g.targetAmount,
      savedAmount: g.savedAmount,
      progressPct: g.progressPct,
      targetDate: g.targetDate,
      requiredMonthlySaving: g.requiredMonthlySaving,
    })),
  };
}
