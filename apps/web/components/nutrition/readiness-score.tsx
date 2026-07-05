'use client';

import { cn } from '@/lib/utils';
import { CHART_COLORS } from '@/lib/chart-theme';

interface ReadinessScoreProps {
  score: number;
  className?: string;
}

export function ReadinessScore({ score, className }: ReadinessScoreProps) {
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? CHART_COLORS.success : score >= 60 ? CHART_COLORS.warning : CHART_COLORS.danger;
  const label = score >= 80 ? 'Excelente' : score >= 60 ? 'Bom' : 'Precisa melhorar';

  return (
    <div className={cn('rounded-card border border-slate-800/50 bg-bg-surface p-6 flex flex-col items-center', className)}>
      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Nutrition Readiness</h3>
      <div className="relative w-32 h-32">
        <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="54" fill="none" stroke="#1e293b" strokeWidth="8" />
          <circle
            cx="60" cy="60" r="54" fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={offset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-[var(--font-mono)] font-bold text-4xl text-white">{Math.round(score)}</span>
        </div>
      </div>
      <p className="text-sm font-medium mt-3" style={{ color }}>{label}</p>
      <p className="text-xs text-slate-500 mt-1 text-center">
        Score baseado em adesao, consistencia e metricas nutricionais
      </p>
    </div>
  );
}
