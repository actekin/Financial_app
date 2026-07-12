'use client';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Cell,
} from 'recharts';
import { MonthlyPoint } from '@/lib/advisor/analysis';
import { chart, compactMoney, fullMoney, shortMonth, tooltipStyle } from './common';

// Monthly spending bars with a dashed trailing-average reference line.
// The in-progress current month is rendered dimmed.
export function MonthlyTrendChart({
  data,
  average,
  currency,
  currentMonth,
  height = 220,
}: {
  data: MonthlyPoint[];
  average: number; // cents
  currency: string;
  currentMonth: string;
  height?: number;
}) {
  const rows = data.map(m => ({ ...m, label: shortMonth(m.month) }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={rows} margin={{ top: 12, right: 8, left: 4, bottom: 0 }} barCategoryGap="28%">
        <CartesianGrid stroke={chart.grid} strokeWidth={1} vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: chart.muted, fontSize: 11 }}
          axisLine={{ stroke: chart.axis }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: chart.muted, fontSize: 11 }}
          tickFormatter={(v: number) => compactMoney(v, currency)}
          axisLine={false}
          tickLine={false}
          width={56}
        />
        <Tooltip
          cursor={{ fill: 'rgba(255,255,255,0.04)' }}
          contentStyle={tooltipStyle}
          formatter={(value) => [fullMoney(Number(value), currency), 'Spending']}
        />
        {average > 0 && (
          <ReferenceLine
            y={average}
            stroke={chart.reference}
            strokeDasharray="4 4"
            strokeWidth={1}
            label={{
              value: `avg ${compactMoney(average, currency)}`,
              position: 'insideTopRight',
              fill: chart.ink,
              fontSize: 11,
            }}
          />
        )}
        <Bar dataKey="spending" radius={[4, 4, 0, 0]} maxBarSize={28}>
          {rows.map(row => (
            <Cell
              key={row.month}
              fill={row.month === currentMonth ? chart.series1Dim : chart.series1}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
