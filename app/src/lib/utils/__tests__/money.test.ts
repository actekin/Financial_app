import { describe, it, expect } from 'vitest';
import { toCents, fromCents, formatMoneyShort } from '../money';
import { Currency } from '@/types';

describe('toCents', () => {
  it('converts whole dollars to cents', () => {
    expect(toCents(12)).toBe(1200);
  });

  it('converts decimal amounts to cents', () => {
    expect(toCents(12.50)).toBe(1250);
    expect(toCents(0.99)).toBe(99);
  });

  it('rounds to nearest cent', () => {
    expect(toCents(12.345)).toBe(1235);
    expect(toCents(12.344)).toBe(1234);
  });

  it('handles zero', () => {
    expect(toCents(0)).toBe(0);
  });

  it('handles negative amounts', () => {
    expect(toCents(-5.50)).toBe(-550);
  });
});

describe('fromCents', () => {
  it('converts cents to dollars', () => {
    expect(fromCents(1250)).toBe(12.50);
  });

  it('handles zero', () => {
    expect(fromCents(0)).toBe(0);
  });

  it('handles negative cents', () => {
    expect(fromCents(-550)).toBe(-5.50);
  });

  it('round-trips with toCents', () => {
    expect(fromCents(toCents(42.99))).toBe(42.99);
  });
});

describe('formatMoneyShort', () => {
  it('formats small amounts with full currency format', () => {
    const result = formatMoneyShort(1250, Currency.USD);
    // Should contain $ and 12.50 (locale formatting may vary)
    expect(result).toContain('$');
    expect(result).toContain('12.50');
  });

  it('formats thousands with K suffix', () => {
    const result = formatMoneyShort(500_000, Currency.USD); // $5,000.00 -> $5.0K
    expect(result).toBe('$5.0K');
  });

  it('formats millions with M suffix', () => {
    const result = formatMoneyShort(150_000_000, Currency.USD); // $1,500,000 -> $1.5M
    expect(result).toBe('$1.5M');
  });

  it('handles negative amounts with K suffix', () => {
    const result = formatMoneyShort(-500_000, Currency.USD);
    expect(result).toBe('-$5.0K');
  });

  it('uses correct currency symbols', () => {
    expect(formatMoneyShort(500_000, Currency.GBP)).toBe('£5.0K');
    expect(formatMoneyShort(500_000, Currency.EUR)).toBe('€5.0K');
    expect(formatMoneyShort(500_000, Currency.TRY)).toBe('₺5.0K');
  });
});
