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
    <div className="py-6 space-y-8 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/nutricao"
          aria-label="Voltar"
          className="flex items-center justify-center w-11 h-11 rounded-full bg-bg-surface border border-border text-text-secondary hover:text-text-primary transition-colors active:scale-[0.98] shrink-0"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
        </Link>
        <h1 className="font-heading font-bold text-2xl text-text-primary">Tendencias Nutricionais</h1>
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
                  : 'bg-bg-surface text-text-secondary border border-border hover:text-text-primary',
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
                  : 'bg-bg-surface text-text-secondary border border-border hover:text-text-primary',
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
          <div className="h-64 rounded-2xl bg-bg-surface animate-pulse" />
          <div className="h-64 rounded-2xl bg-bg-surface animate-pulse" />
        </div>
      ) : trends.length > 0 ? (
        <>
          <CarbsSodiumChart data={trends} />
          <AdherenceChart data={trends} />
        </>
      ) : null}

      {!trendsQuery.isLoading && trends.length === 0 && (
        <div className="flex flex-col items-center py-12 space-y-3">
          <span className="material-symbols-outlined text-3xl text-text-muted">monitoring</span>
          <p className="text-sm text-text-secondary text-center">
            Sem dados suficientes para exibir tendencias. Continue registrando sua nutricao.
          </p>
        </div>
      )}

      <div className="h-4" />
    </div>
  );
}
