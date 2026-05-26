'use client';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

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
    <div style={{
      background: '#283139',
      border: '1px solid #334155',
      borderRadius: 12,
      padding: 10,
      fontSize: 12,
      boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
    }}>
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
      <div className="flex items-center justify-center h-full text-sm text-slate-500">
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
          tick={{ fontSize: 10, fill: '#64748b' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis hide domain={[0, maxTSS * 1.2]} />
        <Tooltip content={<CustomTooltip />} cursor={false} />
        <Bar
          dataKey="tss"
          fill="#3b82f6"
          radius={[8, 8, 0, 0]}
          opacity={0.8}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
