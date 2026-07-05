'use client';

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { CHART_COLORS, CHART_AXIS_TICK, CHART_TOOLTIP_CONTAINER, formatChartDate } from '@/lib/chart-theme';

interface DataPoint {
  date: string;
  weightKg: number;
}

interface WeightChartInnerProps {
  data: DataPoint[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip(props: any) {
  const { active, payload, label } = props;
  if (!active || !Array.isArray(payload) || payload.length === 0) return null;
  const val = Number(payload[0]?.value);
  return (
    <div style={CHART_TOOLTIP_CONTAINER}>
      <p style={{ color: '#94a3b8', marginBottom: 4 }}>{label ? formatChartDate(String(label)) : ''}</p>
      <p style={{ color: '#fff', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
        {isFinite(val) ? val.toFixed(1) : '—'} kg
      </p>
    </div>
  );
}

export default function WeightChartInner({ data }: WeightChartInnerProps) {
  if (!data || data.length < 2) return null;

  const weights = data.map((d) => d.weightKg);
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const padding = Math.max((max - min) * 0.2, 0.5);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <defs>
          <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART_COLORS.weight} stopOpacity={0.3} />
            <stop offset="100%" stopColor={CHART_COLORS.weight} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="date"
          tickFormatter={formatChartDate}
          tick={{ ...CHART_AXIS_TICK, fontSize: 9 }}
          axisLine={false}
          tickLine={false}
          interval={Math.max(Math.floor(data.length / 5), 1)}
        />
        <YAxis
          domain={[min - padding, max + padding]}
          tick={{ ...CHART_AXIS_TICK, fontSize: 9 }}
          axisLine={false}
          tickLine={false}
          width={35}
          tickFormatter={(v: number) => v.toFixed(1)}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="weightKg"
          stroke={CHART_COLORS.weight}
          strokeWidth={2}
          fill="url(#weightGradient)"
          dot={false}
          activeDot={{ r: 4, fill: CHART_COLORS.weight, stroke: '#fff', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
