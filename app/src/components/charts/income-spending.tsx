'use client';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { MonthlyPoint } from '@/lib/advisor/analysis';
import { chart, ChartLegend, compactMoney, fullMoney, shortMonth, tooltipStyle } from './common';

export function IncomeSpendingChart({
  data,
  currency,
  height = 220,
}: {
  data: MonthlyPoint[];
  currency: string;
  height?: number;
}) {
  const rows = data.map(m => ({ ...m, label: shortMonth(m.month) }));

  return (
    <div>
      <ChartLegend
        items={[
          { label: 'Income', color: chart.series2 },
          { label: 'Spending', color: chart.series1 },
        ]}
      />
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={rows} margin={{ top: 8, right: 8, left: 4, bottom: 0 }} barCategoryGap="24%" barGap={2}>
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
            formatter={(value, name) => [fullMoney(Number(value), currency), name === 'income' ? 'Income' : 'Spending']}
          />
          <Bar dataKey="income" fill={chart.series2} radius={[4, 4, 0, 0]} maxBarSize={16} />
          <Bar dataKey="spending" fill={chart.series1} radius={[4, 4, 0, 0]} maxBarSize={16} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
