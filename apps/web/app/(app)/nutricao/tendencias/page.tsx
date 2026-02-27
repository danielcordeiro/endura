'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { apiFetch, cn } from '@/lib/utils';
import { CarbsSodiumChart, AdherenceChart } from '@/components/nutrition/trends-chart';
import { ReadinessScore } from '@/components/nutrition/readiness-score';

interface TrendDataPoint {
  date: string;
  carbsPerHour: number;
  sodiumPerHour: number;
  adherenceScore: number;
}

export default function TendenciasPage() {
  const { token } = useAuthStore();
  const [days, setDays] = useState(30);
  const [discipline, setDiscipline] = useState('all');

  const trendsQuery = useQuery<{ data: TrendDataPoint[] }>({
    queryKey: ['nutrition-trends', days, discipline],
    queryFn: () =>
      apiFetch<{ data: TrendDataPoint[] }>(
        `/api/nutrition/trends?days=${days}&discipline=${discipline}`,
        { token: token ?? undefined },
      ),
    enabled: !!token,
  });

  const readinessQuery = useQuery<{ data: { score: number } }>({
    queryKey: ['nutrition-readiness'],
    queryFn: () =>
      apiFetch<{ data: { score: number } }>('/api/nutrition/readiness-score', {
        token: token ?? undefined,
      }),
    enabled: !!token,
  });

  const trends = trendsQuery.data?.data ?? [];
  const readinessScore = readinessQuery.data?.data?.score ?? 0;

  const periodOptions = [
    { value: 7, label: '7d' },
    { value: 30, label: '30d' },
    { value: 90, label: '90d' },
  ];

  const disciplineOptions = [
    { value: 'all', label: 'Todos' },
    { value: 'swim', label: 'Swim' },
    { value: 'bike', label: 'Bike' },
    { value: 'run', label: 'Run' },
  ];

  return (
    <div className="py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/nutricao"
          className="flex items-center justify-center w-10 h-10 rounded-full bg-[#1c262f] border border-slate-800/50 text-slate-400 hover:text-slate-100 transition-colors shrink-0"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
        </Link>
        <h1 className="font-heading font-bold text-xl text-slate-100">Tendencias Nutricionais</h1>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <div className="flex gap-2">
          {periodOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setDays(opt.value)}
              className={cn(
                'px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-colors',
                days === opt.value
                  ? 'bg-primary text-white'
                  : 'bg-[#1c262f] text-slate-400 border border-slate-800/50 hover:text-slate-100',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {disciplineOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setDiscipline(opt.value)}
              className={cn(
                'px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-colors',
                discipline === opt.value
                  ? 'bg-primary/20 text-primary border border-primary/30'
                  : 'bg-[#1c262f] text-slate-400 border border-slate-800/50 hover:text-slate-100',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Readiness Score */}
      <ReadinessScore score={readinessScore} />

      {/* Charts */}
      {trendsQuery.isLoading ? (
        <div className="space-y-4">
          <div className="h-64 rounded-2xl bg-[#1c262f] animate-pulse" />
          <div className="h-64 rounded-2xl bg-[#1c262f] animate-pulse" />
        </div>
      ) : (
        <>
          <CarbsSodiumChart data={trends} />
          <AdherenceChart data={trends} />
        </>
      )}

      {!trendsQuery.isLoading && trends.length === 0 && (
        <div className="flex flex-col items-center py-12 space-y-3">
          <span className="material-symbols-outlined text-3xl text-slate-500">monitoring</span>
          <p className="text-sm text-slate-400 text-center">
            Sem dados suficientes para exibir tendencias. Continue registrando sua nutricao.
          </p>
        </div>
      )}

      <div className="h-4" />
    </div>
  );
}
