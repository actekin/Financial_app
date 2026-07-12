'use client';

import { Currency, CURRENCY_SYMBOLS } from '@/types';
import { fromCents } from '@/lib/utils/money';

// Chart ink + series tokens for the dark surface (validated dark-mode palette)
export const chart = {
  grid: '#2c2c2a',
  axis: '#383835',
  muted: '#898781',
  ink: '#c3c2b7',
  series1: '#3987e5', // blue — primary series / spending
  series2: '#199e70', // aqua — secondary series / income
  series1Dim: 'rgba(57, 135, 229, 0.45)',
  reference: '#c3c2b7',
  good: '#0ca30c',
  critical: '#e66767',
};

export function currencySymbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency as Currency] || `${currency} `;
}

// Compact tick label: £1.2K, £850, £1.5M — cents in, label out
export function compactMoney(cents: number, currency: string): string {
  const sym = currencySymbol(currency);
  const value = fromCents(Math.abs(cents));
  const sign = cents < 0 ? '-' : '';
  if (value >= 1_000_000) return `${sign}${sym}${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 10_000) return `${sign}${sym}${(value / 1_000).toFixed(0)}K`;
  if (value >= 1_000) return `${sign}${sym}${(value / 1_000).toFixed(1)}K`;
  return `${sign}${sym}${value.toFixed(0)}`;
}

export function fullMoney(cents: number, currency: string): string {
  const sym = currencySymbol(currency);
  const sign = cents < 0 ? '-' : '';
  return `${sign}${sym}${fromCents(Math.abs(cents)).toLocaleString('en-GB', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function shortMonth(key: string): string {
  const [, m] = key.split('-');
  return MONTH_NAMES[parseInt(m, 10) - 1] || key;
}

export const tooltipStyle = {
  backgroundColor: '#111827',
  border: '1px solid #374151',
  borderRadius: '0.75rem',
  fontSize: '0.75rem',
  color: '#e5e7eb',
  padding: '8px 12px',
} as const;

export function ChartLegend({ items }: { items: Array<{ label: string; color: string }> }) {
  return (
    <div className="flex items-center gap-4 px-1 pb-1">
      {items.map(item => (
        <span key={item.label} className="flex items-center gap-1.5 text-xs text-gray-400">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
          {item.label}
        </span>
      ))}
    </div>
  );
}
