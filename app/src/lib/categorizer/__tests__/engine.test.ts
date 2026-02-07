import { describe, it, expect } from 'vitest';
import { categorizeTransaction, categorizeTransactions } from '../engine';
import { AutoCategory, TransactionDirection } from '@/types';

describe('categorizeTransaction', () => {
  // --- Inflows ---

  it('categorizes salary inflows', () => {
    expect(categorizeTransaction('PAYROLL ACME CORP', TransactionDirection.INFLOW)).toBe(AutoCategory.SALARY);
    expect(categorizeTransaction('Monthly Salary', TransactionDirection.INFLOW)).toBe(AutoCategory.SALARY);
    expect(categorizeTransaction('Direct Deposit Employer', TransactionDirection.INFLOW)).toBe(AutoCategory.SALARY);
  });

  it('categorizes freelance income', () => {
    expect(categorizeTransaction('Freelance Payment', TransactionDirection.INFLOW)).toBe(AutoCategory.FREELANCE_INCOME);
    expect(categorizeTransaction('Consulting Fee Invoice #123', TransactionDirection.INFLOW)).toBe(AutoCategory.FREELANCE_INCOME);
  });

  it('categorizes interest income', () => {
    expect(categorizeTransaction('Interest Paid', TransactionDirection.INFLOW)).toBe(AutoCategory.INTEREST);
  });

  it('categorizes investment returns', () => {
    expect(categorizeTransaction('Dividend Payment AAPL', TransactionDirection.INFLOW)).toBe(AutoCategory.INVESTMENT_RETURN);
  });

  it('categorizes transfer inflows', () => {
    expect(categorizeTransaction('Transfer from Savings', TransactionDirection.INFLOW)).toBe(AutoCategory.TRANSFER_IN);
  });

  // --- Outflows ---

  it('categorizes rent payments', () => {
    expect(categorizeTransaction('Rent Payment Apr', TransactionDirection.OUTFLOW)).toBe(AutoCategory.RENT);
    expect(categorizeTransaction('Landlord John Smith', TransactionDirection.OUTFLOW)).toBe(AutoCategory.RENT);
  });

  it('categorizes utility bills', () => {
    expect(categorizeTransaction('British Gas Monthly', TransactionDirection.OUTFLOW)).toBe(AutoCategory.UTILITIES);
    expect(categorizeTransaction('Thames Water Direct Debit', TransactionDirection.OUTFLOW)).toBe(AutoCategory.UTILITIES);
  });

  it('categorizes subscriptions', () => {
    expect(categorizeTransaction('NETFLIX.COM', TransactionDirection.OUTFLOW)).toBe(AutoCategory.SUBSCRIPTIONS);
    expect(categorizeTransaction('Spotify Premium', TransactionDirection.OUTFLOW)).toBe(AutoCategory.SUBSCRIPTIONS);
    expect(categorizeTransaction('Apple Music', TransactionDirection.OUTFLOW)).toBe(AutoCategory.SUBSCRIPTIONS);
  });

  it('categorizes groceries', () => {
    expect(categorizeTransaction('TESCO STORES 1234', TransactionDirection.OUTFLOW)).toBe(AutoCategory.GROCERIES);
    expect(categorizeTransaction('Sainsbury Local', TransactionDirection.OUTFLOW)).toBe(AutoCategory.GROCERIES);
    expect(categorizeTransaction('Whole Foods Market', TransactionDirection.OUTFLOW)).toBe(AutoCategory.GROCERIES);
  });

  it('categorizes dining', () => {
    expect(categorizeTransaction('STARBUCKS COFFEE #123', TransactionDirection.OUTFLOW)).toBe(AutoCategory.DINING);
    expect(categorizeTransaction('Uber Eats Order', TransactionDirection.OUTFLOW)).toBe(AutoCategory.DINING);
    expect(categorizeTransaction('McDonalds Restaurant', TransactionDirection.OUTFLOW)).toBe(AutoCategory.DINING);
  });

  it('categorizes transport (not Uber Eats)', () => {
    expect(categorizeTransaction('UBER TRIP BOS', TransactionDirection.OUTFLOW)).toBe(AutoCategory.TRANSPORT);
    expect(categorizeTransaction('TFL Travel charge', TransactionDirection.OUTFLOW)).toBe(AutoCategory.TRANSPORT);
  });

  it('categorizes travel', () => {
    expect(categorizeTransaction('Airbnb Booking London', TransactionDirection.OUTFLOW)).toBe(AutoCategory.TRAVEL);
    expect(categorizeTransaction('RYANAIR LTD', TransactionDirection.OUTFLOW)).toBe(AutoCategory.TRAVEL);
  });

  it('categorizes shopping', () => {
    expect(categorizeTransaction('AMAZON.CO.UK Purchase', TransactionDirection.OUTFLOW)).toBe(AutoCategory.SHOPPING);
    expect(categorizeTransaction('ZARA UK Online', TransactionDirection.OUTFLOW)).toBe(AutoCategory.SHOPPING);
  });

  it('categorizes ATM withdrawals', () => {
    expect(categorizeTransaction('ATM WITHDRAWAL', TransactionDirection.OUTFLOW)).toBe(AutoCategory.ATM_WITHDRAWAL);
    expect(categorizeTransaction('Cash Withdrawal High St', TransactionDirection.OUTFLOW)).toBe(AutoCategory.ATM_WITHDRAWAL);
  });

  it('categorizes transfers out', () => {
    expect(categorizeTransaction('Transfer to Savings', TransactionDirection.OUTFLOW)).toBe(AutoCategory.TRANSFER_OUT);
  });

  // --- Direction sensitivity ---

  it('respects direction-specific rules', () => {
    // "salary" should only match inflows, not outflows
    expect(categorizeTransaction('Salary', TransactionDirection.INFLOW)).toBe(AutoCategory.SALARY);
    // As outflow, "salary" won't match the salary rule (direction guard) - falls through to OTHER or another match
    const result = categorizeTransaction('Salary', TransactionDirection.OUTFLOW);
    expect(result).not.toBe(AutoCategory.SALARY);
  });

  // --- Fallback ---

  it('falls back to OTHER for unrecognized descriptions', () => {
    expect(categorizeTransaction('Random XYZ 12345 ABCDE', TransactionDirection.OUTFLOW)).toBe(AutoCategory.OTHER);
    expect(categorizeTransaction('Unknown merchant', TransactionDirection.INFLOW)).toBe(AutoCategory.OTHER);
  });
});

describe('categorizeTransactions (batch)', () => {
  it('categorizes multiple transactions at once', () => {
    const transactions = [
      { description: 'PAYROLL ACME', direction: TransactionDirection.INFLOW },
      { description: 'TESCO STORES', direction: TransactionDirection.OUTFLOW },
      { description: 'XYZ Unknown', direction: TransactionDirection.OUTFLOW },
    ];

    const results = categorizeTransactions(transactions);
    expect(results).toEqual([AutoCategory.SALARY, AutoCategory.GROCERIES, AutoCategory.OTHER]);
  });

  it('returns empty array for empty input', () => {
    expect(categorizeTransactions([])).toEqual([]);
  });
});
