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
  // série realizada (histórico) — null nos pontos de projeção
  ctl: number | null;
  atl: number | null;
  tsb: number | null;
  // série projetada (forecast) — null no histórico, exceto o ponto de junção (hoje)
  ctlF?: number | null;
  atlF?: number | null;
  tsbF?: number | null;
  tss?: number;
}

interface PMCChartInnerProps {
  data: DataPoint[];
  /** data ISO (YYYY-MM-DD) da prova-alvo, para marcar no eixo */
  raceDate?: string | null;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip(props: any) {
  const { active, payload, label } = props;
  if (!active || !Array.isArray(payload) || payload.length === 0) return null;

  // Une histórico e forecast por métrica (CTL/ATL/TSB) e remove o Area duplicado.
  const LABELS: Record<string, { name: string; color: string }> = {
    ctl: { name: 'CTL', color: '#3b82f6' },
    ctlF: { name: 'CTL', color: '#3b82f6' },
    atl: { name: 'ATL', color: '#f43f5e' },
    atlF: { name: 'ATL', color: '#f43f5e' },
    tsb: { name: 'TSB', color: '#22c55e' },
    tsbF: { name: 'TSB', color: '#22c55e' },
  };
  const byMetric = new Map<string, { name: string; color: string; value: number }>();
  for (const entry of payload) {
    const key = String(entry?.dataKey ?? '');
    const meta = LABELS[key];
    if (!meta) continue;
    const val = Number(entry?.value);
    if (!isFinite(val)) continue;
    if (!byMetric.has(meta.name)) byMetric.set(meta.name, { ...meta, value: val });
  }
  const rows = [...byMetric.values()];
  if (rows.length === 0) return null;

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
      {rows.map((entry, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: entry.color, display: 'inline-block' }} />
          <span style={{ color: '#cbd5e1' }}>{entry.name}:</span>
          <span style={{ color: '#fff', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
            {entry.value.toFixed(1)}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function PMCChartInner({ data, raceDate }: PMCChartInnerProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-slate-500">
        Sem dados suficientes
      </div>
    );
  }

  const hasForecast = data.some((d) => d.ctlF != null && d.ctl == null);

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
        {hasForecast && raceDate && (
          <ReferenceLine
            x={raceDate}
            stroke="#fbbf24"
            strokeWidth={1.5}
            strokeDasharray="2 2"
            label={{ value: 'PROVA', position: 'top', fontSize: 9, fill: '#fbbf24' }}
          />
        )}
        <Area
          type="monotone"
          dataKey="tsb"
          name="TSB (area)"
          fill="url(#tsbGradient)"
          stroke="none"
          tooltipType="none"
          connectNulls={false}
        />

        {/* Histórico (linha sólida) */}
        <Line type="monotone" dataKey="ctl" name="CTL" stroke="#3b82f6" strokeWidth={2} dot={false} connectNulls={false} />
        <Line type="monotone" dataKey="atl" name="ATL" stroke="#f43f5e" strokeWidth={2} dot={false} strokeDasharray="4 4" connectNulls={false} />
        <Line type="monotone" dataKey="tsb" name="TSB" stroke="#22c55e" strokeWidth={2} dot={false} connectNulls={false} />

        {/* Projeção (linha tracejada, mais clara) */}
        {hasForecast && (
          <>
            <Line type="monotone" dataKey="ctlF" name="CTL proj." stroke="#3b82f6" strokeWidth={2} strokeOpacity={0.65} strokeDasharray="1 3" dot={false} connectNulls={false} />
            <Line type="monotone" dataKey="atlF" name="ATL proj." stroke="#f43f5e" strokeWidth={2} strokeOpacity={0.65} strokeDasharray="1 3" dot={false} connectNulls={false} />
            <Line type="monotone" dataKey="tsbF" name="TSB proj." stroke="#22c55e" strokeWidth={2} strokeOpacity={0.65} strokeDasharray="1 3" dot={false} connectNulls={false} />
          </>
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
