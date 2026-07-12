import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockDb = vi.hoisted(() => ({
  all: vi.fn(),
  get: vi.fn(),
  run: vi.fn(),
}));

vi.mock('@/lib/db/client', () => ({
  db: mockDb,
}));

import { getAccountBalances, getGoalsWithProgress } from '../analysis';

const checking = {
  id: 1,
  bank: 'lloyds',
  name: 'Joint Checking',
  type: 'checking',
  currency: 'GBP',
  isActive: true,
  groupName: null,
  createdAt: '2025-01-01T00:00:00.000Z',
};

function mockBalancesFor(accounts: unknown[], snapshot: { date: string; balance: number } | undefined, flow: number) {
  mockDb.all.mockImplementation(async (sql: string) => {
    if (sql.includes('FROM accounts')) return accounts;
    if (sql.includes('FROM goals')) return [];
    return [];
  });
  mockDb.get.mockImplementation(async (sql: string) => {
    if (sql.includes('FROM snapshots')) return snapshot;
    if (sql.includes('FROM transactions')) return { flow };
    return undefined;
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('getAccountBalances', () => {
  it('adds post-snapshot flows to the latest snapshot balance', async () => {
    mockBalancesFor([checking], { date: '2026-06-01', balance: 500_000 }, -120_000);

    const balances = await getAccountBalances();

    expect(balances).toHaveLength(1);
    expect(balances[0].balance).toBe(380_000); // 5000.00 - 1200.00
    expect(balances[0].asOf).toBe('2026-06-01');
  });

  it('falls back to summed flows when there is no snapshot', async () => {
    mockBalancesFor([checking], undefined, 250_000);

    const balances = await getAccountBalances();

    expect(balances[0].balance).toBe(250_000);
    expect(balances[0].asOf).toBe('inferred');
  });
});

describe('getGoalsWithProgress', () => {
  it('computes progress, remaining, and required monthly saving for manual goals', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-01T00:00:00Z'));

    mockDb.all.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM goals')) {
        return [
          {
            id: 1,
            name: 'Holiday',
            emoji: '🏝️',
            targetAmount: 300_000, // £3,000
            savedAmount: 120_000, // £1,200
            currency: 'GBP',
            targetDate: '2026-12-31',
            linkedAccountId: null,
            notes: null,
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ];
      }
      if (sql.includes('FROM accounts')) return [];
      return [];
    });

    const goals = await getGoalsWithProgress();

    expect(goals).toHaveLength(1);
    expect(goals[0].progressPct).toBe(40);
    expect(goals[0].remainingAmount).toBe(180_000);
    // ~6 months to 2026-12-31 → ~£300/month
    expect(goals[0].monthsLeft).toBeGreaterThan(5.5);
    expect(goals[0].monthsLeft).toBeLessThan(6.5);
    expect(goals[0].requiredMonthlySaving).toBeGreaterThan(25_000);
    expect(goals[0].requiredMonthlySaving).toBeLessThan(35_000);
  });

  it('tracks linked-account goals from the account balance', async () => {
    mockDb.all.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM goals')) {
        return [
          {
            id: 2,
            name: 'Emergency fund',
            emoji: null,
            targetAmount: 1_000_000,
            savedAmount: 0, // ignored when linked
            currency: 'GBP',
            targetDate: null,
            linkedAccountId: 1,
            notes: null,
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ];
      }
      if (sql.includes('FROM accounts')) return [checking];
      return [];
    });
    mockDb.get.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM snapshots')) return { date: '2026-06-01', balance: 400_000 };
      if (sql.includes('FROM transactions')) return { flow: 100_000 };
      return undefined;
    });

    const goals = await getGoalsWithProgress();

    expect(goals[0].savedAmount).toBe(500_000); // snapshot + flows
    expect(goals[0].progressPct).toBe(50);
    expect(goals[0].requiredMonthlySaving).toBeNull(); // no target date
  });
});
