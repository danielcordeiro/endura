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
import { CHART_GRID, CHART_AXIS_TICK, CHART_TOOLTIP_CONTAINER } from '@/lib/chart-theme';
import { formatClock } from '@/lib/activity-format';
import type { ActivityStreamsResponse } from './analysis-types';

interface AnalysisGraphInnerProps {
  streams: ActivityStreamsResponse;
}

interface ChartPoint {
  t: number;
  power: number | null;
  hr: number | null;
  cadence: number | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip(props: any) {
  const { active, payload, label } = props;
  if (!active || !Array.isArray(payload) || payload.length === 0) return null;
  const rows: { name: string; color: string; value: number; unit: string }[] = [];
  for (const entry of payload) {
    const key = String(entry?.dataKey ?? '');
    const val = Number(entry?.value);
    if (!isFinite(val)) continue;
    if (key === 'power') rows.push({ name: 'Potência', color: '#2196f5', value: val, unit: 'W' });
    if (key === 'hr') rows.push({ name: 'FC', color: '#f0524e', value: val, unit: 'bpm' });
    if (key === 'cadence') rows.push({ name: 'Cadência', color: '#f5a524', value: val, unit: 'rpm' });
  }
  if (rows.length === 0) return null;
  return (
    <div style={CHART_TOOLTIP_CONTAINER}>
      <p style={{ color: '#94a3b8', marginBottom: 8 }}>{formatClock(Number(label))}</p>
      {rows.map((r) => (
        <div key={r.name} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: r.color, display: 'inline-block' }} />
          <span style={{ color: '#cbd5e1' }}>{r.name}:</span>
          <span style={{ color: '#fff', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
            {r.value.toFixed(0)} {r.unit}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function AnalysisGraphInner({ streams }: AnalysisGraphInnerProps) {
  const data: ChartPoint[] = streams.timeSec.map((t, i) => ({
    t,
    power: streams.watts[i] ?? null,
    hr: streams.heartRate[i] ?? null,
    cadence: streams.cadence[i] ?? null,
  }));

  const hasPower = data.some((d) => d.power != null && d.power > 0);
  const hasHr = data.some((d) => d.hr != null && d.hr > 0);
  const hasCadence = data.some((d) => d.cadence != null && d.cadence > 0);
  // Eixo em que os marcadores de lap são desenhados — null quando não há
  // nenhum eixo Y renderizado (atividade sem nenhum sensor, só GPS).
  const lapAxisId = hasPower ? 'power' : hasHr || hasCadence ? 'hr' : null;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="powerGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2196f5" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#2196f5" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="t"
          type="number"
          domain={['dataMin', 'dataMax']}
          tickFormatter={(v: number) => formatClock(v)}
          tick={CHART_AXIS_TICK}
          axisLine={false}
          tickLine={false}
          minTickGap={40}
        />
        {hasPower && (
          <YAxis yAxisId="power" tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} width={36} />
        )}
        {(hasHr || hasCadence) && (
          <YAxis yAxisId="hr" orientation="right" tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} width={36} />
        )}
        <Tooltip content={<CustomTooltip />} />
        {lapAxisId && streams.laps.slice(1).map((lap) => (
          <ReferenceLine
            key={lap.lapIndex}
            x={lap.startOffsetSec}
            yAxisId={lapAxisId}
            stroke={CHART_GRID}
            strokeDasharray="2 2"
            label={{ value: `L${lap.lapIndex}`, position: 'top', fontSize: 9, fill: '#64748b' }}
          />
        ))}
        {hasPower && (
          <Area yAxisId="power" type="monotone" dataKey="power" name="Potência" stroke="#2196f5" fill="url(#powerGradient)" strokeWidth={1.5} dot={false} isAnimationActive={false} />
        )}
        {hasHr && (
          <Line yAxisId="hr" type="monotone" dataKey="hr" name="FC" stroke="#f0524e" strokeWidth={1.5} dot={false} isAnimationActive={false} />
        )}
        {hasCadence && (
          <Line yAxisId="hr" type="monotone" dataKey="cadence" name="Cadência" stroke="#f5a524" strokeWidth={1} strokeOpacity={0.6} strokeDasharray="3 3" dot={false} isAnimationActive={false} />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
