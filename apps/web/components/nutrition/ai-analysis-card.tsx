'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { apiFetch } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { AlertBanner } from '@/components/ui/alert-banner';
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

const severityVariant = {
  info: 'info',
  warning: 'warning',
  critical: 'danger',
} as const;

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
        <span className="text-[8px] font-bold uppercase tracking-widest text-text-muted">ADESAO</span>
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
      <div className="rounded-card border border-border bg-bg-surface p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-500/15">
            <span className="material-symbols-outlined text-xl text-purple-400">auto_awesome</span>
          </div>
          <div>
            <h3 className="font-heading font-bold text-base text-text-primary">Analise com IA</h3>
            <p className="text-xs text-text-muted">Compare sua nutricao prescrita vs executada</p>
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
          <AlertBanner variant="danger" className="mt-3">Erro ao gerar analise. Tente novamente.</AlertBanner>
        )}
      </div>
    );
  }

  // Loading
  if (analysisQuery.isLoading) {
    return (
      <div className="rounded-card border border-border bg-bg-surface p-5 animate-pulse space-y-4">
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
    <div className="rounded-card border border-border bg-bg-surface p-5 space-y-5">
      {/* Header with score */}
      <div className="flex items-start gap-4">
        <ScoreRing score={analysis.adherenceScore} />
        <div className="flex-1 min-w-0">
          <h3 className="font-heading font-bold text-base text-text-primary mb-1">
            Analise Nutricional
          </h3>
          <p className="text-sm text-text-secondary leading-relaxed">
            {analysis.summary}
          </p>
        </div>
      </div>

      {/* Insights */}
      {analysis.insights.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Insights</p>
          {analysis.insights.map((item, i) => {
            const variant = severityVariant[item.severity] ?? 'info';
            return (
              <AlertBanner key={i} variant={variant}>
                <span className="text-xs font-bold block mb-1">
                  {categoryLabels[item.category] ?? item.category}
                </span>
                <p className="text-sm text-text-secondary">{item.insight}</p>
                {item.recommendation && (
                  <p className="text-xs text-text-secondary mt-1.5">
                    <span className="font-bold text-text-secondary">Recomendacao:</span> {item.recommendation}
                  </p>
                )}
              </AlertBanner>
            );
          })}
        </div>
      )}

      {/* Patterns */}
      {analysis.patterns.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Padroes detectados</p>
          {analysis.patterns.map((pat, i) => (
            <div
              key={i}
              className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/10"
            >
              <p className="text-sm text-text-secondary">{pat.pattern}</p>
              <p className="text-xs text-text-muted mt-1">{pat.frequency}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
