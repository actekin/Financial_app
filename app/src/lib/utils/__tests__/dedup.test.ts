import { describe, it, expect } from 'vitest';
import { transactionFingerprint } from '../dedup';

describe('transactionFingerprint', () => {
  it('produces a 32-character hex hash', () => {
    const fp = transactionFingerprint(1, '2025-01-15', 12.50, 'outflow', 'STARBUCKS');
    expect(fp).toMatch(/^[a-f0-9]{32}$/);
  });

  it('produces identical fingerprints for identical inputs', () => {
    const fp1 = transactionFingerprint(1, '2025-01-15', 12.50, 'outflow', 'STARBUCKS');
    const fp2 = transactionFingerprint(1, '2025-01-15', 12.50, 'outflow', 'STARBUCKS');
    expect(fp1).toBe(fp2);
  });

  it('produces different fingerprints for different accounts', () => {
    const fp1 = transactionFingerprint(1, '2025-01-15', 12.50, 'outflow', 'STARBUCKS');
    const fp2 = transactionFingerprint(2, '2025-01-15', 12.50, 'outflow', 'STARBUCKS');
    expect(fp1).not.toBe(fp2);
  });

  it('produces different fingerprints for different dates', () => {
    const fp1 = transactionFingerprint(1, '2025-01-15', 12.50, 'outflow', 'STARBUCKS');
    const fp2 = transactionFingerprint(1, '2025-01-16', 12.50, 'outflow', 'STARBUCKS');
    expect(fp1).not.toBe(fp2);
  });

  it('produces different fingerprints for different amounts', () => {
    const fp1 = transactionFingerprint(1, '2025-01-15', 12.50, 'outflow', 'STARBUCKS');
    const fp2 = transactionFingerprint(1, '2025-01-15', 13.00, 'outflow', 'STARBUCKS');
    expect(fp1).not.toBe(fp2);
  });

  it('produces different fingerprints for different directions', () => {
    const fp1 = transactionFingerprint(1, '2025-01-15', 12.50, 'outflow', 'STARBUCKS');
    const fp2 = transactionFingerprint(1, '2025-01-15', 12.50, 'inflow', 'STARBUCKS');
    expect(fp1).not.toBe(fp2);
  });

  it('normalizes whitespace in descriptions', () => {
    const fp1 = transactionFingerprint(1, '2025-01-15', 12.50, 'outflow', 'STAR  BUCKS');
    const fp2 = transactionFingerprint(1, '2025-01-15', 12.50, 'outflow', 'STAR BUCKS');
    expect(fp1).toBe(fp2);
  });

  it('normalizes case in descriptions', () => {
    const fp1 = transactionFingerprint(1, '2025-01-15', 12.50, 'outflow', 'Starbucks');
    const fp2 = transactionFingerprint(1, '2025-01-15', 12.50, 'outflow', 'STARBUCKS');
    expect(fp1).toBe(fp2);
  });

  it('trims leading/trailing whitespace in descriptions', () => {
    const fp1 = transactionFingerprint(1, '2025-01-15', 12.50, 'outflow', '  STARBUCKS  ');
    const fp2 = transactionFingerprint(1, '2025-01-15', 12.50, 'outflow', 'STARBUCKS');
    expect(fp1).toBe(fp2);
  });
});
