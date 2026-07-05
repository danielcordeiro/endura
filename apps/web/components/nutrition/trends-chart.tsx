'use client';

import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';
import { CHART_COLORS, CHART_GRID, CHART_TICK_FILL, CHART_TOOLTIP_CONTAINER } from '@/lib/chart-theme';

interface TrendDataPoint {
  date: string;
  carbsPerHour: number;
  sodiumPerHour: number;
  adherenceScore: number;
}

interface TrendsChartProps {
  data: TrendDataPoint[];
  className?: string;
}

export function CarbsSodiumChart({ data, className }: TrendsChartProps) {
  return (
    <div className={cn('rounded-card border border-border bg-bg-surface p-5', className)}>
      <h3 className="text-sm font-bold text-text-secondary uppercase tracking-widest mb-4">Carbs/h e Sodio/h</h3>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
          <XAxis dataKey="date" tick={{ fill: CHART_TICK_FILL, fontSize: 10 }} />
          <YAxis tick={{ fill: CHART_TICK_FILL, fontSize: 10 }} />
          <Tooltip
            contentStyle={CHART_TOOLTIP_CONTAINER}
            labelStyle={{ color: '#94a3b8' }}
          />
          <Line type="monotone" dataKey="carbsPerHour" name="Carbs g/h" stroke={CHART_COLORS.fitness} strokeWidth={2} dot={{ r: 3 }} />
          <Line type="monotone" dataKey="sodiumPerHour" name="Sodio mg/h" stroke={CHART_COLORS.warning} strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function AdherenceChart({ data, className }: TrendsChartProps) {
  return (
    <div className={cn('rounded-card border border-border bg-bg-surface p-5', className)}>
      <h3 className="text-sm font-bold text-text-secondary uppercase tracking-widest mb-4">Score de Adesao por Semana</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
          <XAxis dataKey="date" tick={{ fill: CHART_TICK_FILL, fontSize: 10 }} />
          <YAxis domain={[0, 100]} tick={{ fill: CHART_TICK_FILL, fontSize: 10 }} />
          <Tooltip
            contentStyle={CHART_TOOLTIP_CONTAINER}
            labelStyle={{ color: '#94a3b8' }}
          />
          <Bar dataKey="adherenceScore" name="Adesao" fill={CHART_COLORS.success} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
