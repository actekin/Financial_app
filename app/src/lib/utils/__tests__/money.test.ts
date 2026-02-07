import { describe, it, expect } from 'vitest';
import { toCents, fromCents, formatMoney, formatMoneyShort } from '../money';
import { Currency } from '@/types';

describe('toCents', () => {
  it('converts whole dollar amounts', () => {
    expect(toCents(12)).toBe(1200);
    expect(toCents(0)).toBe(0);
    expect(toCents(1)).toBe(100);
  });

  it('converts fractional amounts', () => {
    expect(toCents(12.5)).toBe(1250);
    expect(toCents(12.99)).toBe(1299);
    expect(toCents(0.01)).toBe(1);
  });

  it('rounds floating point edge cases', () => {
    // 19.99 * 100 = 1998.9999... in float; should round to 1999
    expect(toCents(19.99)).toBe(1999);
    expect(toCents(0.1 + 0.2)).toBe(30);
  });

  it('handles negative amounts', () => {
    expect(toCents(-5.5)).toBe(-550);
  });
});

describe('fromCents', () => {
  it('converts cents to dollars', () => {
    expect(fromCents(1250)).toBe(12.5);
    expect(fromCents(0)).toBe(0);
    expect(fromCents(100)).toBe(1);
    expect(fromCents(1)).toBe(0.01);
  });

  it('handles negative values', () => {
    expect(fromCents(-550)).toBe(-5.5);
  });
});

describe('formatMoney', () => {
  it('formats USD', () => {
    const result = formatMoney(125099, Currency.USD);
    expect(result).toContain('1,250.99');
  });

  it('formats GBP', () => {
    const result = formatMoney(99900, Currency.GBP);
    expect(result).toContain('999.00');
  });

  it('formats zero', () => {
    const result = formatMoney(0, Currency.USD);
    expect(result).toContain('0.00');
  });
});

describe('formatMoneyShort', () => {
  it('uses K suffix for thousands', () => {
    // 50,000.00 = 5_000_000 cents
    const result = formatMoneyShort(5_000_000, Currency.USD);
    expect(result).toBe('$50.0K');
  });

  it('uses M suffix for millions', () => {
    // 1,500,000.00 = 150_000_000 cents
    const result = formatMoneyShort(150_000_000, Currency.USD);
    expect(result).toBe('$1.5M');
  });

  it('falls back to full format for small amounts', () => {
    const result = formatMoneyShort(1250, Currency.USD);
    expect(result).toContain('12.50');
  });

  it('handles negative amounts with K suffix', () => {
    const result = formatMoneyShort(-5_000_000, Currency.GBP);
    expect(result).toBe('-£50.0K');
  });
});
