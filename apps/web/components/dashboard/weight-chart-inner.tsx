'use client';

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

interface DataPoint {
  date: string;
  weightKg: number;
}

interface WeightChartInnerProps {
  data: DataPoint[];
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
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
      <p style={{ color: '#94a3b8', marginBottom: 4 }}>{label ? formatDate(String(label)) : ''}</p>
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
            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="date"
          tickFormatter={formatDate}
          tick={{ fontSize: 9, fill: '#64748b' }}
          axisLine={false}
          tickLine={false}
          interval={Math.max(Math.floor(data.length / 5), 1)}
        />
        <YAxis
          domain={[min - padding, max + padding]}
          tick={{ fontSize: 9, fill: '#64748b' }}
          axisLine={false}
          tickLine={false}
          width={35}
          tickFormatter={(v: number) => v.toFixed(1)}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="weightKg"
          stroke="#3b82f6"
          strokeWidth={2}
          fill="url(#weightGradient)"
          dot={false}
          activeDot={{ r: 4, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
