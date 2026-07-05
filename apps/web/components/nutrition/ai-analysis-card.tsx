'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { apiFetch, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { CHART_COLORS } from '@/lib/chart-theme';

/* ── Types ── */

interface InsightItem {
  category: string;
  severity: 'info' | 'warning' | 'critical';
  insight: string;
  recommendation: string;
}

interface AnalysisData {
  data: {
    adherenceScore: number;
    insights: InsightItem[];
    patterns: Array<{ pattern: string; frequency: string; recommendation: string }>;
    summary: string;
  };
}

interface AiAnalysisCardProps {
  activityId: string;
  hasNutritionLog: boolean;
}

const severityConfig = {
  info: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', icon: 'info', text: 'text-blue-400' },
  warning: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', icon: 'warning', text: 'text-amber-400' },
  critical: { bg: 'bg-red-500/10', border: 'border-red-500/20', icon: 'error', text: 'text-red-400' },
};

const categoryLabels: Record<string, string> = {
  sub_fueling: 'Sub-fueling',
  over_fueling: 'Over-fueling',
  timing: 'Timing',
  gi_tolerance: 'Tolerancia GI',
  hydration: 'Hidratacao',
};

function ScoreRing({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 36;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? CHART_COLORS.success : score >= 60 ? CHART_COLORS.warning : CHART_COLORS.danger;

  return (
    <div className="relative w-24 h-24">
      <svg className="w-24 h-24 -rotate-90" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r="36" fill="none" stroke="#1e293b" strokeWidth="6" />
        <circle
          cx="40"
          cy="40"
          r="36"
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-[var(--font-mono)] font-bold text-2xl text-white">{Math.round(score)}</span>
        <span className="text-[8px] font-bold uppercase tracking-widest text-slate-500">ADESAO</span>
      </div>
    </div>
  );
}

/* ── Component ── */

export function AiAnalysisCard({ activityId, hasNutritionLog }: AiAnalysisCardProps) {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();

  const analysisQuery = useQuery<AnalysisData>({
    queryKey: ['nutrition-analysis', activityId],
    queryFn: () =>
      apiFetch<AnalysisData>(`/api/nutrition-analysis/${activityId}`, {
        token: token ?? undefined,
      }),
    enabled: !!token && !!activityId,
    retry: false,
  });

  const analyzeMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/api/nutrition-analysis/${activityId}`, {
        method: 'POST',
        token: token ?? undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nutrition-analysis', activityId] });
    },
  });

  const analysis = analysisQuery.data?.data;

  // No log yet - don't show anything
  if (!hasNutritionLog) return null;

  // No analysis yet - show generate button
  if (!analysis && !analysisQuery.isLoading) {
    return (
      <div className="rounded-card border border-slate-800/50 bg-bg-surface p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-500/15">
            <span className="material-symbols-outlined text-xl text-purple-400">auto_awesome</span>
          </div>
          <div>
            <h3 className="font-heading font-bold text-base text-text-primary">Analise com IA</h3>
            <p className="text-xs text-slate-500">Compare sua nutricao prescrita vs executada</p>
          </div>
        </div>

        <Button
          variant="primary"
          fullWidth
          onClick={() => analyzeMutation.mutate()}
          loading={analyzeMutation.isPending}
          className="gap-2"
        >
          <span className="material-symbols-outlined text-lg">auto_awesome</span>
          Analisar com IA
        </Button>

        {analyzeMutation.isError && (
          <p className="text-[13px] text-red-400 mt-3">Erro ao gerar analise. Tente novamente.</p>
        )}
      </div>
    );
  }

  // Loading
  if (analysisQuery.isLoading) {
    return (
      <div className="rounded-card border border-slate-800/50 bg-bg-surface p-5 animate-pulse space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-bg-surface" />
          <div className="h-5 w-40 rounded bg-bg-surface" />
        </div>
        <div className="h-24 rounded-xl bg-bg-surface" />
      </div>
    );
  }

  if (!analysis) return null;

  return (
    <div className="rounded-card border border-slate-800/50 bg-bg-surface p-5 space-y-5">
      {/* Header with score */}
      <div className="flex items-start gap-4">
        <ScoreRing score={analysis.adherenceScore} />
        <div className="flex-1 min-w-0">
          <h3 className="font-heading font-bold text-base text-text-primary mb-1">
            Analise Nutricional
          </h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            {analysis.summary}
          </p>
        </div>
      </div>

      {/* Insights */}
      {analysis.insights.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Insights</p>
          {analysis.insights.map((item, i) => {
            const config = severityConfig[item.severity] ?? severityConfig.info;
            return (
              <div
                key={i}
                className={cn('p-3.5 rounded-xl border', config.bg, config.border)}
              >
                <div className="flex items-start gap-2">
                  <span className={cn('material-symbols-outlined text-lg shrink-0 mt-0.5', config.text)}>
                    {config.icon}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn('text-xs font-bold', config.text)}>
                        {categoryLabels[item.category] ?? item.category}
                      </span>
                    </div>
                    <p className="text-sm text-slate-300">{item.insight}</p>
                    {item.recommendation && (
                      <p className="text-xs text-slate-400 mt-1.5">
                        <span className="font-bold text-slate-300">Recomendacao:</span> {item.recommendation}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Patterns */}
      {analysis.patterns.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Padroes detectados</p>
          {analysis.patterns.map((pat, i) => (
            <div
              key={i}
              className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/10"
            >
              <p className="text-sm text-slate-300">{pat.pattern}</p>
              <p className="text-xs text-slate-500 mt-1">{pat.frequency}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
