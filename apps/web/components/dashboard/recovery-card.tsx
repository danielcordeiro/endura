'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { apiFetch, cn } from '@/lib/utils';

interface RecoveryMetric {
  key: 'hrv' | 'rhr' | 'sleep' | 'resp';
  label: string;
  today: number | null;
  baseline: number | null;
  score: number | null;
  direction: 'higher_better' | 'lower_better';
}

interface RecoveryData {
  date: string | null;
  score: number | null;
  band: 'green' | 'yellow' | 'red' | 'unknown';
  label: string;
  recommendation: string;
  metrics: RecoveryMetric[];
  baselineDays: number;
}

const BAND = {
  green: { ring: '#22c55e', text: 'text-emerald-400', soft: 'bg-emerald-500/10 border-emerald-500/30' },
  yellow: { ring: '#f59e0b', text: 'text-amber-400', soft: 'bg-amber-500/10 border-amber-500/30' },
  red: { ring: '#f43f5e', text: 'text-rose-400', soft: 'bg-rose-500/10 border-rose-500/30' },
  unknown: { ring: '#64748b', text: 'text-slate-400', soft: 'bg-slate-500/10 border-slate-500/30' },
} as const;

function subColor(score: number | null): string {
  if (score == null) return 'bg-slate-700';
  if (score >= 67) return 'bg-emerald-500';
  if (score >= 34) return 'bg-amber-500';
  return 'bg-rose-500';
}

const UNIT: Record<RecoveryMetric['key'], string> = { hrv: 'ms', rhr: 'bpm', sleep: '', resp: 'rpm' };

function ScoreRing({ score, color }: { score: number; color: string }) {
  const size = 132;
  const radius = (size - 14) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ * (1 - Math.min(Math.max(score, 0), 100) / 100);
  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#1e293b" strokeWidth={10} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={10}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
    </svg>
  );
}

export function RecoveryCard() {
  const token = useAuthStore((s) => s.token);

  const { data, isLoading } = useQuery<RecoveryData | null>({
    queryKey: ['recovery-score'],
    queryFn: async () => {
      const res = await apiFetch<{ data: RecoveryData | null }>('/api/performance/recovery', {
        token: token ?? undefined,
      });
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!token,
  });

  if (isLoading) {
    return (
      <div className="rounded-card bg-bg-surface p-6 border border-hairline shadow-card">
        <div className="skeleton h-4 w-32 rounded mb-4" />
        <div className="flex justify-center mb-4"><div className="skeleton h-32 w-32 rounded-full" /></div>
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-14 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  // Sem score (sem wellness suficiente) → não mostra o card.
  if (!data || data.score == null) return null;

  const band = BAND[data.band] ?? BAND.unknown;

  return (
    <div className="rounded-card bg-bg-surface p-6 border border-hairline shadow-card">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <span className="material-symbols-outlined text-lg text-slate-400">ecg_heart</span>
          <div>
            <h3 className="font-heading text-base font-bold text-text-primary">Recuperação</h3>
            <p className="text-[10px] text-slate-500">vs baseline pessoal · {data.baselineDays}d</p>
          </div>
        </div>
        <span className={cn('text-[11px] font-bold px-2.5 py-1 rounded-full border', band.soft, band.text)}>
          {data.label}
        </span>
      </div>

      {/* Score ring */}
      <div className="flex justify-center mb-2">
        <div className="relative">
          <ScoreRing score={data.score} color={band.ring} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn('font-mono text-4xl font-bold leading-none', band.text)}>{data.score}</span>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">recovery</span>
          </div>
        </div>
      </div>

      {/* Recomendação */}
      <p className="text-xs text-slate-400 leading-relaxed text-center mb-5 px-2">{data.recommendation}</p>

      {/* Métricas (bandas por contribuição) */}
      <div className="grid grid-cols-2 gap-2">
        {data.metrics.map((m) => (
          <div key={m.key} className="bg-bg-elevated rounded-2xl p-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider">{m.label}</span>
              {m.score != null && (
                <span className="text-[10px] font-mono font-bold text-slate-300">{m.score}</span>
              )}
            </div>
            {m.today != null ? (
              <p className="font-mono text-sm font-bold text-slate-100 leading-none">
                {m.today}
                <span className="text-[9px] text-slate-500 font-normal ml-0.5">{UNIT[m.key]}</span>
                {m.baseline != null && (
                  <span className="text-[9px] text-slate-600 font-normal ml-1.5">base {m.baseline}</span>
                )}
              </p>
            ) : (
              <p className="font-mono text-sm text-slate-600 leading-none">—</p>
            )}
            <div className="mt-2 h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                className={cn('h-full rounded-full', subColor(m.score))}
                style={{ width: m.score != null ? `${m.score}%` : '0%' }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
