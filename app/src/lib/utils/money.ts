import { Currency } from '@/types';

// Convert a float amount (e.g. 12.50) to integer cents (1250)
export function toCents(amount: number): number {
  return Math.round(amount * 100);
}

// Convert integer cents (1250) to float amount (12.50)
export function fromCents(cents: number): number {
  return cents / 100;
}

const formatters: Record<Currency, Intl.NumberFormat> = {
  [Currency.USD]: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }),
  [Currency.EUR]: new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }),
  [Currency.GBP]: new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }),
  [Currency.TRY]: new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }),
};

export function formatMoney(cents: number, currency: Currency): string {
  return formatters[currency].format(fromCents(cents));
}

export function formatMoneyShort(cents: number, currency: Currency): string {
  const abs = Math.abs(cents);
  const symbols: Record<Currency, string> = {
    [Currency.USD]: '$',
    [Currency.EUR]: '€',
    [Currency.GBP]: '£',
    [Currency.TRY]: '₺',
  };

  const sym = symbols[currency];

  if (abs >= 100_000_00) {
    return `${cents < 0 ? '-' : ''}${sym}${(fromCents(abs) / 1_000_000).toFixed(1)}M`;
  }
  if (abs >= 1_000_00) {
    return `${cents < 0 ? '-' : ''}${sym}${(fromCents(abs) / 1_000).toFixed(1)}K`;
  }
  return formatMoney(cents, currency);
}
