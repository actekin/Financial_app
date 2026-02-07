import { describe, it, expect } from 'vitest';
import { transactionFingerprint } from '../dedup';

describe('transactionFingerprint', () => {
  it('produces a 32-character hex string', () => {
    const fp = transactionFingerprint(1, '2024-01-15', 42.50, 'outflow', 'TESCO STORES');
    expect(fp).toMatch(/^[a-f0-9]{32}$/);
  });

  it('is deterministic (same inputs produce same output)', () => {
    const a = transactionFingerprint(1, '2024-01-15', 42.50, 'outflow', 'TESCO STORES');
    const b = transactionFingerprint(1, '2024-01-15', 42.50, 'outflow', 'TESCO STORES');
    expect(a).toBe(b);
  });

  it('normalizes description whitespace', () => {
    const a = transactionFingerprint(1, '2024-01-15', 10, 'outflow', 'TESCO   STORES');
    const b = transactionFingerprint(1, '2024-01-15', 10, 'outflow', 'TESCO STORES');
    expect(a).toBe(b);
  });

  it('normalizes description case', () => {
    const a = transactionFingerprint(1, '2024-01-15', 10, 'outflow', 'Tesco Stores');
    const b = transactionFingerprint(1, '2024-01-15', 10, 'outflow', 'tesco stores');
    expect(a).toBe(b);
  });

  it('produces different hashes for different accounts', () => {
    const a = transactionFingerprint(1, '2024-01-15', 10, 'outflow', 'TESCO');
    const b = transactionFingerprint(2, '2024-01-15', 10, 'outflow', 'TESCO');
    expect(a).not.toBe(b);
  });

  it('produces different hashes for different dates', () => {
    const a = transactionFingerprint(1, '2024-01-15', 10, 'outflow', 'TESCO');
    const b = transactionFingerprint(1, '2024-01-16', 10, 'outflow', 'TESCO');
    expect(a).not.toBe(b);
  });

  it('produces different hashes for different amounts', () => {
    const a = transactionFingerprint(1, '2024-01-15', 10, 'outflow', 'TESCO');
    const b = transactionFingerprint(1, '2024-01-15', 10.01, 'outflow', 'TESCO');
    expect(a).not.toBe(b);
  });

  it('produces different hashes for different directions', () => {
    const a = transactionFingerprint(1, '2024-01-15', 10, 'inflow', 'Transfer');
    const b = transactionFingerprint(1, '2024-01-15', 10, 'outflow', 'Transfer');
    expect(a).not.toBe(b);
  });
});
