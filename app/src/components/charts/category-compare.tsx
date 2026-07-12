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
import { CategoryComparison } from '@/lib/advisor/analysis';
import { chart, ChartLegend, compactMoney, fullMoney, tooltipStyle } from './common';

// Horizontal grouped bars: this month vs trailing monthly average per category.
export function CategoryCompareChart({
  data,
  currency,
  maxCategories = 7,
}: {
  data: CategoryComparison[];
  currency: string;
  maxCategories?: number;
}) {
  const rows = data.slice(0, maxCategories);
  const height = Math.max(rows.length * 52 + 30, 140);

  return (
    <div>
      <ChartLegend
        items={[
          { label: 'This month', color: chart.series1 },
          { label: 'Monthly average', color: chart.series2 },
        ]}
      />
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }} barGap={2}>
          <CartesianGrid stroke={chart.grid} strokeWidth={1} horizontal={false} />
          <XAxis
            type="number"
            tick={{ fill: chart.muted, fontSize: 11 }}
            tickFormatter={(v: number) => compactMoney(v, currency)}
            axisLine={{ stroke: chart.axis }}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="label"
            tick={{ fill: chart.ink, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={92}
          />
          <Tooltip
            cursor={{ fill: 'rgba(255,255,255,0.04)' }}
            contentStyle={tooltipStyle}
            formatter={(value, name) => [
              fullMoney(Number(value), currency),
              name === 'thisMonth' ? 'This month' : 'Monthly average',
            ]}
          />
          <Bar dataKey="thisMonth" fill={chart.series1} radius={[0, 4, 4, 0]} maxBarSize={12} />
          <Bar dataKey="monthlyAverage" fill={chart.series2} radius={[0, 4, 4, 0]} maxBarSize={12} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
