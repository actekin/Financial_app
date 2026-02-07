import { describe, it, expect } from 'vitest';
import { categorizeTransaction, categorizeTransactions } from '../engine';
import { AutoCategory, TransactionDirection } from '@/types';

describe('categorizeTransaction', () => {
  it('categorizes salary inflows', () => {
    expect(
      categorizeTransaction('PAYROLL DEPOSIT', TransactionDirection.INFLOW)
    ).toBe(AutoCategory.SALARY);
  });

  it('categorizes salary with different keywords', () => {
    expect(
      categorizeTransaction('Monthly Salary', TransactionDirection.INFLOW)
    ).toBe(AutoCategory.SALARY);

    expect(
      categorizeTransaction('EMPLOYER DIRECT DEPOSIT', TransactionDirection.INFLOW)
    ).toBe(AutoCategory.SALARY);
  });

  it('categorizes grocery outflows', () => {
    expect(
      categorizeTransaction('TESCO STORES 1234', TransactionDirection.OUTFLOW)
    ).toBe(AutoCategory.GROCERIES);

    expect(
      categorizeTransaction('SAINSBURY\'S #567', TransactionDirection.OUTFLOW)
    ).toBe(AutoCategory.GROCERIES);
  });

  it('categorizes subscription outflows', () => {
    expect(
      categorizeTransaction('NETFLIX.COM', TransactionDirection.OUTFLOW)
    ).toBe(AutoCategory.SUBSCRIPTIONS);

    expect(
      categorizeTransaction('Spotify Premium', TransactionDirection.OUTFLOW)
    ).toBe(AutoCategory.SUBSCRIPTIONS);
  });

  it('categorizes dining outflows', () => {
    expect(
      categorizeTransaction('STARBUCKS COFFEE', TransactionDirection.OUTFLOW)
    ).toBe(AutoCategory.DINING);

    expect(
      categorizeTransaction('UBER EATS ORDER', TransactionDirection.OUTFLOW)
    ).toBe(AutoCategory.DINING);
  });

  it('categorizes rent outflows', () => {
    expect(
      categorizeTransaction('RENT PAYMENT', TransactionDirection.OUTFLOW)
    ).toBe(AutoCategory.RENT);

    expect(
      categorizeTransaction('Landlord Monthly', TransactionDirection.OUTFLOW)
    ).toBe(AutoCategory.RENT);
  });

  it('categorizes ATM withdrawals', () => {
    expect(
      categorizeTransaction('ATM WITHDRAWAL #4532', TransactionDirection.OUTFLOW)
    ).toBe(AutoCategory.ATM_WITHDRAWAL);
  });

  it('categorizes transfers', () => {
    expect(
      categorizeTransaction('Transfer from savings', TransactionDirection.INFLOW)
    ).toBe(AutoCategory.TRANSFER_IN);

    expect(
      categorizeTransaction('Transfer to savings', TransactionDirection.OUTFLOW)
    ).toBe(AutoCategory.TRANSFER_OUT);
  });

  it('respects direction when matching', () => {
    // "salary" pattern only matches inflows
    expect(
      categorizeTransaction('Salary refund', TransactionDirection.OUTFLOW)
    ).not.toBe(AutoCategory.SALARY);
  });

  it('returns OTHER for unrecognized descriptions', () => {
    expect(
      categorizeTransaction('XYZZY RANDOM VENDOR', TransactionDirection.OUTFLOW)
    ).toBe(AutoCategory.OTHER);
  });
});

describe('categorizeTransactions', () => {
  it('categorizes a batch of transactions', () => {
    const transactions = [
      { description: 'PAYROLL DEPOSIT', direction: TransactionDirection.INFLOW },
      { description: 'TESCO STORES', direction: TransactionDirection.OUTFLOW },
      { description: 'UNKNOWN VENDOR', direction: TransactionDirection.OUTFLOW },
    ];

    const results = categorizeTransactions(transactions);

    expect(results).toHaveLength(3);
    expect(results[0]).toBe(AutoCategory.SALARY);
    expect(results[1]).toBe(AutoCategory.GROCERIES);
    expect(results[2]).toBe(AutoCategory.OTHER);
  });

  it('returns empty array for empty input', () => {
    expect(categorizeTransactions([])).toEqual([]);
  });
});
