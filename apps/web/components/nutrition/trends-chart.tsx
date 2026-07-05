'use client';

import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';

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
    <div className={cn('rounded-card border border-slate-800/50 bg-bg-surface p-5', className)}>
      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Carbs/h e Sodio/h</h3>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} />
          <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
          <Tooltip
            contentStyle={{ backgroundColor: '#1c262f', border: '1px solid #334155', borderRadius: 12, fontSize: 12 }}
            labelStyle={{ color: '#94a3b8' }}
          />
          <Line type="monotone" dataKey="carbsPerHour" name="Carbs g/h" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
          <Line type="monotone" dataKey="sodiumPerHour" name="Sodio mg/h" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function AdherenceChart({ data, className }: TrendsChartProps) {
  return (
    <div className={cn('rounded-card border border-slate-800/50 bg-bg-surface p-5', className)}>
      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Score de Adesao por Semana</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} />
          <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} />
          <Tooltip
            contentStyle={{ backgroundColor: '#1c262f', border: '1px solid #334155', borderRadius: 12, fontSize: 12 }}
            labelStyle={{ color: '#94a3b8' }}
          />
          <Bar dataKey="adherenceScore" name="Adesao" fill="#22c55e" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
