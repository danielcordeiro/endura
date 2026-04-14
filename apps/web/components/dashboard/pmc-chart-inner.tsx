'use client';

import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from 'recharts';

interface DataPoint {
  date: string;
  tss: number;
  ctl: number;
  atl: number;
  tsb: number;
}

interface PMCChartInnerProps {
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

  // Filter out the area duplicate (TSB appears as both Area and Line)
  const seen = new Set<string>();
  const filtered = payload.filter((entry: any) => {
    const name = String(entry?.name ?? '');
    if (seen.has(name)) return false;
    seen.add(name);
    return true;
  });

  return (
    <div style={{
      background: '#283139',
      border: '1px solid #334155',
      borderRadius: 12,
      padding: 12,
      fontSize: 12,
      boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
    }}>
      <p style={{ color: '#94a3b8', marginBottom: 8 }}>{label ? formatDate(String(label)) : ''}</p>
      {filtered.map((entry: any, i: number) => {
        const val = Number(entry?.value);
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: String(entry?.color ?? '#64748b'),
              display: 'inline-block',
            }} />
            <span style={{ color: '#cbd5e1' }}>{String(entry?.name ?? '')}:</span>
            <span style={{ color: '#fff', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
              {isFinite(val) ? val.toFixed(1) : '—'}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function PMCChartInner({ data }: PMCChartInnerProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-slate-500">
        Sem dados suficientes
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data}>
        <defs>
          <linearGradient id="tsbGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22c55e" stopOpacity={0.3} />
            <stop offset="50%" stopColor="#22c55e" stopOpacity={0} />
            <stop offset="50%" stopColor="#ef4444" stopOpacity={0} />
            <stop offset="100%" stopColor="#ef4444" stopOpacity={0.3} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="date"
          tickFormatter={formatDate}
          tick={{ fontSize: 10, fill: '#64748b' }}
          axisLine={false}
          tickLine={false}
          interval={Math.floor(data.length / 5)}
        />
        <YAxis
          tick={{ fontSize: 10, fill: '#64748b' }}
          axisLine={false}
          tickLine={false}
          width={30}
        />
        <Tooltip content={<CustomTooltip />} />
        <ReferenceLine y={0} stroke="#334155" strokeDasharray="3 3" />
        <Area
          type="monotone"
          dataKey="tsb"
          name="TSB (area)"
          fill="url(#tsbGradient)"
          stroke="none"
          tooltipType="none"
        />
        <Line
          type="monotone"
          dataKey="ctl"
          name="CTL"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="atl"
          name="ATL"
          stroke="#f43f5e"
          strokeWidth={2}
          dot={false}
          strokeDasharray="4 4"
        />
        <Line
          type="monotone"
          dataKey="tsb"
          name="TSB"
          stroke="#22c55e"
          strokeWidth={2}
          dot={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
