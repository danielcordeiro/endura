'use client';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { CHART_COLORS, CHART_AXIS_TICK, CHART_TOOLTIP_CONTAINER } from '@/lib/chart-theme';

interface DataPoint {
  date: string;
  tss: number;
}

interface WeeklyLoadChartInnerProps {
  data: DataPoint[];
}

function formatDay(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip(props: any) {
  const { active, payload, label } = props;
  if (!active || !Array.isArray(payload) || payload.length === 0) return null;
  const val = Number(payload[0]?.value);
  return (
    <div style={CHART_TOOLTIP_CONTAINER}>
      <p style={{ color: '#94a3b8', marginBottom: 4 }}>{label ? String(label) : ''}</p>
      <p style={{ color: '#fff', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
        TSS: {isFinite(val) ? val.toFixed(0) : '—'}
      </p>
    </div>
  );
}

export default function WeeklyLoadChartInner({ data }: WeeklyLoadChartInnerProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-1.5 h-full text-sm text-text-muted">
        <span className="material-symbols-outlined text-2xl text-text-faint">bar_chart</span>
        Sem dados
      </div>
    );
  }

  const chartData = data.map((m) => ({ ...m, day: formatDay(m.date) }));
  const maxTSS = Math.max(...data.map((d) => d.tss), 1);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} barSize={24}>
        <XAxis
          dataKey="day"
          tick={CHART_AXIS_TICK}
          axisLine={false}
          tickLine={false}
        />
        <YAxis hide domain={[0, maxTSS * 1.2]} />
        <Tooltip content={<CustomTooltip />} cursor={false} />
        <Bar
          dataKey="tss"
          fill={CHART_COLORS.load}
          radius={[8, 8, 0, 0]}
          opacity={0.8}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
