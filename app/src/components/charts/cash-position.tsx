'use client';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';
import { FinancialContext } from '@/lib/advisor/analysis';
import { chart, compactMoney, fullMoney, tooltipStyle } from './common';

// Horizontal bars, one per account. Negative balances (credit cards) in red.
export function CashPositionChart({ accounts }: { accounts: FinancialContext['cash']['accounts'] }) {
  const rows = accounts.map(a => ({
    ...a,
    label: a.name.length > 18 ? `${a.name.slice(0, 17)}…` : a.name,
  }));
  const height = Math.max(rows.length * 44 + 30, 120);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid stroke={chart.grid} strokeWidth={1} horizontal={false} />
        <XAxis
          type="number"
          tick={{ fill: chart.muted, fontSize: 11 }}
          tickFormatter={(v: number) => compactMoney(v, rows[0]?.currency || 'USD')}
          axisLine={{ stroke: chart.axis }}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="label"
          tick={{ fill: chart.ink, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={110}
        />
        <Tooltip
          cursor={{ fill: 'rgba(255,255,255,0.04)' }}
          contentStyle={tooltipStyle}
          formatter={(value, _name, item) => [
            fullMoney(Number(value), (item?.payload?.currency as string) || 'USD'),
            'Balance',
          ]}
        />
        <Bar dataKey="balance" radius={[0, 4, 4, 0]} maxBarSize={14}>
          {rows.map(row => (
            <Cell key={row.id} fill={row.balance < 0 ? chart.critical : chart.series1} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
