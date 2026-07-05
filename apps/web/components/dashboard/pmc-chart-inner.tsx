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
import { CHART_COLORS, CHART_GRID, CHART_AXIS_TICK, CHART_TOOLTIP_CONTAINER, formatChartDate } from '@/lib/chart-theme';

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip(props: any) {
  const { active, payload, label } = props;
  if (!active || !Array.isArray(payload) || payload.length === 0) return null;

  // Une histórico e forecast por métrica (CTL/ATL/TSB) e remove o Area duplicado.
  const LABELS: Record<string, { name: string; color: string }> = {
    ctl: { name: 'CTL', color: CHART_COLORS.fitness },
    ctlF: { name: 'CTL', color: CHART_COLORS.fitness },
    atl: { name: 'ATL', color: CHART_COLORS.fatigue },
    atlF: { name: 'ATL', color: CHART_COLORS.fatigue },
    tsb: { name: 'TSB', color: CHART_COLORS.form },
    tsbF: { name: 'TSB', color: CHART_COLORS.form },
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
    <div style={CHART_TOOLTIP_CONTAINER}>
      <p style={{ color: '#94a3b8', marginBottom: 8 }}>{label ? formatChartDate(String(label)) : ''}</p>
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
            <stop offset="0%" stopColor={CHART_COLORS.form} stopOpacity={0.3} />
            <stop offset="50%" stopColor={CHART_COLORS.form} stopOpacity={0} />
            <stop offset="50%" stopColor={CHART_COLORS.danger} stopOpacity={0} />
            <stop offset="100%" stopColor={CHART_COLORS.danger} stopOpacity={0.3} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="date"
          tickFormatter={formatChartDate}
          tick={CHART_AXIS_TICK}
          axisLine={false}
          tickLine={false}
          interval={Math.floor(data.length / 5)}
        />
        <YAxis
          tick={CHART_AXIS_TICK}
          axisLine={false}
          tickLine={false}
          width={30}
        />
        <Tooltip content={<CustomTooltip />} />
        <ReferenceLine y={0} stroke={CHART_GRID} strokeDasharray="3 3" />
        {hasForecast && raceDate && (
          <ReferenceLine
            x={raceDate}
            stroke={CHART_COLORS.warning}
            strokeWidth={1.5}
            strokeDasharray="2 2"
            label={{ value: 'PROVA', position: 'top', fontSize: 9, fill: CHART_COLORS.warning }}
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
        <Line type="monotone" dataKey="ctl" name="CTL" stroke={CHART_COLORS.fitness} strokeWidth={2} dot={false} connectNulls={false} />
        <Line type="monotone" dataKey="atl" name="ATL" stroke={CHART_COLORS.fatigue} strokeWidth={2} dot={false} strokeDasharray="4 4" connectNulls={false} />
        <Line type="monotone" dataKey="tsb" name="TSB" stroke={CHART_COLORS.form} strokeWidth={2} dot={false} connectNulls={false} />

        {/* Projeção (linha tracejada, mais clara) */}
        {hasForecast && (
          <>
            <Line type="monotone" dataKey="ctlF" name="CTL proj." stroke={CHART_COLORS.fitness} strokeWidth={2} strokeOpacity={0.9} strokeDasharray="5 4" dot={false} connectNulls={false} />
            <Line type="monotone" dataKey="atlF" name="ATL proj." stroke={CHART_COLORS.fatigue} strokeWidth={2} strokeOpacity={0.9} strokeDasharray="5 4" dot={false} connectNulls={false} />
            <Line type="monotone" dataKey="tsbF" name="TSB proj." stroke={CHART_COLORS.form} strokeWidth={2} strokeOpacity={0.9} strokeDasharray="5 4" dot={false} connectNulls={false} />
          </>
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
