'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { apiFetch, cn } from '@/lib/utils';

interface ReadinessAssessment {
  level: 'intense' | 'moderate' | 'light' | 'rest';
  score: number;
  factors: {
    tsb: number;
    tsbTrend: 'rising' | 'falling' | 'stable';
    ctl: number;
    recentLoadTrend: 'increasing' | 'decreasing' | 'stable';
    sleepQuality: number | null;
    hrvStatus: 'above' | 'below' | 'normal' | 'unknown';
  };
  recommendation: string;
  mentorMessage: string;
  loadTarget?: {
    tssLow: number;
    tssHigh: number;
    label: string;
  };
}

interface ReadinessCardProps {
  readiness: ReadinessAssessment & { checkinSaved?: boolean };
}

const levelConfig = {
  intense: {
    label: 'INTENSO',
    icon: 'bolt',
    color: 'text-success',
    bg: 'bg-success/15',
    ring: 'ring-success/20',
    gradient: 'from-success/20 to-success/5',
    barColor: 'bg-success',
  },
  moderate: {
    label: 'MODERADO',
    icon: 'trending_up',
    color: 'text-info',
    bg: 'bg-info/15',
    ring: 'ring-info/20',
    gradient: 'from-info/20 to-info/5',
    barColor: 'bg-info',
  },
  light: {
    label: 'LEVE',
    icon: 'self_improvement',
    color: 'text-warning',
    bg: 'bg-warning/15',
    ring: 'ring-warning/20',
    gradient: 'from-warning/20 to-warning/5',
    barColor: 'bg-warning',
  },
  rest: {
    label: 'DESCANSO',
    icon: 'bedtime',
    color: 'text-purple-400',
    bg: 'bg-purple-500/15',
    ring: 'ring-purple-500/20',
    gradient: 'from-purple-500/20 to-purple-600/5',
    barColor: 'bg-purple-500',
  },
};

const trendIcons: Record<string, string> = {
  rising: 'trending_up',
  falling: 'trending_down',
  stable: 'trending_flat',
  increasing: 'trending_up',
  decreasing: 'trending_down',
};

const feelingEmojis = [
  { value: 1, label: 'Pessimo', emoji: '😩' },
  { value: 2, label: 'Ruim', emoji: '😔' },
  { value: 3, label: 'Ok', emoji: '😐' },
  { value: 4, label: 'Bom', emoji: '😊' },
  { value: 5, label: 'Otimo', emoji: '💪' },
];

const sorenessLevels = [
  { value: 1, label: 'Nenhuma', color: 'bg-success' },
  { value: 2, label: 'Leve', color: 'bg-success' },
  { value: 3, label: 'Moderada', color: 'bg-warning' },
  { value: 4, label: 'Alta', color: 'bg-orange-500' },
  { value: 5, label: 'Muito alta', color: 'bg-danger' },
];

export function ReadinessCard({ readiness: initialReadiness }: ReadinessCardProps) {
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();
  const [readiness, setReadiness] = useState(initialReadiness);
  const [showCheckin, setShowCheckin] = useState(false);
  const [feeling, setFeeling] = useState(3);
  const [soreness, setSoreness] = useState(1);
  const [injuryNote, setInjuryNote] = useState('');
  const [hasCheckedIn, setHasCheckedIn] = useState(initialReadiness.checkinSaved ?? false);

  const config = levelConfig[readiness.level];

  const mutation = useMutation({
    mutationFn: async (body: { feeling: number; muscleSoreness: number; injuryNote: string | null }) => {
      const res = await apiFetch<{ data: ReadinessAssessment }>('/api/performance/readiness', {
        method: 'POST',
        token: token ?? undefined,
        body: JSON.stringify(body),
      });
      return res.data;
    },
    onSuccess: (data) => {
      setReadiness(data);
      setShowCheckin(false);
      setHasCheckedIn(true);
      queryClient.invalidateQueries({ queryKey: ['performance-dashboard'] });
    },
  });

  function handleSubmit() {
    mutation.mutate({
      feeling,
      muscleSoreness: soreness,
      injuryNote: injuryNote.trim() || null,
    });
  }

  return (
    <div className={cn(
      'rounded-card p-6 ring-1 shadow-card bg-gradient-to-br overflow-hidden',
      config.gradient,
      config.ring,
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-lg text-text-secondary">smart_toy</span>
          <h3 className="font-heading text-base font-bold text-text-primary">Mentor AI</h3>
        </div>
        {!showCheckin && (
          <button
            onClick={() => setShowCheckin(true)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 shrink-0 whitespace-nowrap',
              hasCheckedIn
                ? 'bg-bg-elevated/50 text-text-secondary hover:text-text-primary'
                : 'bg-primary/20 text-primary hover:bg-primary/30',
            )}
          >
            <span className="material-symbols-outlined text-sm">{hasCheckedIn ? 'refresh' : 'edit_note'}</span>
            {hasCheckedIn ? 'Atualizar' : 'Como estou'}
          </button>
        )}
      </div>

      {/* Check-in form */}
      {showCheckin && (
        <div className="bg-bg-elevated/60 rounded-2xl p-4 mb-4 space-y-4">
          <p className="text-xs font-bold uppercase tracking-wider text-text-secondary">Como voce esta hoje?</p>

          {/* Feeling */}
          <div>
            <p className="text-xs text-text-muted mb-2">Sensacao geral</p>
            <div className="flex gap-1.5">
              {feelingEmojis.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setFeeling(f.value)}
                  className={cn(
                    'flex-1 flex flex-col items-center gap-1 py-2 rounded-xl border transition-all',
                    feeling === f.value
                      ? 'bg-primary/15 border-primary/40 scale-105'
                      : 'bg-bg-surface border-border-strong/50 hover:border-border-strong',
                  )}
                >
                  <span className="text-lg">{f.emoji}</span>
                  <span className="text-[9px] text-text-secondary">{f.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Muscle soreness */}
          <div>
            <p className="text-xs text-text-muted mb-2">Dor muscular</p>
            <div className="flex gap-1.5">
              {sorenessLevels.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setSoreness(s.value)}
                  className={cn(
                    'flex-1 flex flex-col items-center gap-1.5 py-2 rounded-xl border transition-all',
                    soreness === s.value
                      ? 'bg-primary/15 border-primary/40 scale-105'
                      : 'bg-bg-surface border-border-strong/50 hover:border-border-strong',
                  )}
                >
                  <div className={cn('w-3 h-3 rounded-full', s.color)} />
                  <span className="text-[9px] text-text-secondary leading-tight text-center">{s.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Injury note */}
          <div>
            <p className="text-xs text-text-muted mb-2">Lesao ou dor especifica (opcional)</p>
            <textarea
              value={injuryNote}
              onChange={(e) => setInjuryNote(e.target.value)}
              placeholder="Ex: dor no joelho direito, tendinite no ombro..."
              rows={2}
              className="w-full bg-bg-input border border-border-strong rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-text-muted focus:border-primary focus:outline-none transition-colors resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={() => setShowCheckin(false)}
              className="flex-1 h-10 rounded-full bg-bg-surface text-text-secondary text-xs font-bold active:scale-[0.98] transition-transform"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={mutation.isPending}
              className="flex-1 h-10 rounded-full bg-primary text-white text-xs font-bold active:scale-[0.98] transition-transform disabled:opacity-50"
            >
              {mutation.isPending ? 'Analisando...' : 'Recalcular'}
            </button>
          </div>

          {mutation.isError && (
            <p className="text-xs text-danger text-center">Erro ao recalcular. Tente novamente.</p>
          )}
        </div>
      )}

      {/* Level indicator */}
      <div className="flex items-center gap-4 mb-4">
        <div className={cn('flex items-center justify-center w-16 h-16 rounded-2xl', config.bg)}>
          <span className={cn('material-symbols-outlined text-3xl', config.color)}>
            {config.icon}
          </span>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn('text-sm font-bold uppercase tracking-wider', config.color)}>
              {config.label}
            </span>
            <span className="font-mono text-xs text-text-muted">
              {readiness.score}/100
            </span>
            {hasCheckedIn && (
              <span className="text-[9px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-bold">ATUALIZADO</span>
            )}
          </div>
          <div className="h-2 bg-bg-elevated rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all duration-700 ease-out', config.barColor)}
              style={{ width: `${readiness.score}%` }}
            />
          </div>
        </div>
      </div>

      {/* Mentor message */}
      <div className={cn('rounded-2xl p-4 mb-4', config.bg)}>
        <p className="text-sm text-text-primary leading-relaxed">
          {readiness.mentorMessage}
        </p>
      </div>

      {/* Recommendation */}
      <div className="flex items-start gap-2 mb-4">
        <span className="material-symbols-outlined text-base text-text-muted mt-0.5">tips_and_updates</span>
        <p className="text-xs text-text-secondary leading-relaxed">{readiness.recommendation}</p>
      </div>

      {/* Alvo de carga de hoje (estilo WHOOP strain target) */}
      {readiness.loadTarget && (
        <div className="flex items-center justify-between rounded-2xl bg-bg-elevated px-4 py-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-base text-primary">bolt</span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Alvo de hoje</p>
              <p className="text-xs text-text-secondary">{readiness.loadTarget.label}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-mono text-lg font-bold text-white leading-none">
              {readiness.loadTarget.tssLow}–{readiness.loadTarget.tssHigh}
            </p>
            <p className="text-[10px] text-text-muted uppercase tracking-wider">TSS</p>
          </div>
        </div>
      )}

      {/* Factors */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-bg-elevated/50 rounded-xl p-2.5 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <span className="material-symbols-outlined text-xs text-text-muted">
              {trendIcons[readiness.factors.tsbTrend] ?? 'trending_flat'}
            </span>
            <span className="text-[10px] text-text-muted">Forma</span>
          </div>
          <span className={cn(
            'font-mono text-sm font-bold',
            readiness.factors.tsb >= 0 ? 'text-success' : 'text-danger',
          )}>
            {readiness.factors.tsb >= 0 ? '+' : ''}{readiness.factors.tsb.toFixed(0)}
          </span>
        </div>
        <div className="bg-bg-elevated/50 rounded-xl p-2.5 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <span className="material-symbols-outlined text-xs text-text-muted">fitness_center</span>
            <span className="text-[10px] text-text-muted">Fitness</span>
          </div>
          <span className="font-mono text-sm font-bold text-info">
            {readiness.factors.ctl.toFixed(0)}
          </span>
        </div>
        <div className="bg-bg-elevated/50 rounded-xl p-2.5 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <span className="material-symbols-outlined text-xs text-text-muted">
              {trendIcons[readiness.factors.recentLoadTrend] ?? 'trending_flat'}
            </span>
            <span className="text-[10px] text-text-muted">Carga</span>
          </div>
          <span className="font-mono text-sm font-bold text-text-secondary">
            {readiness.factors.recentLoadTrend === 'increasing' ? 'Alta' :
              readiness.factors.recentLoadTrend === 'decreasing' ? 'Baixa' : 'Estavel'}
          </span>
        </div>
      </div>
    </div>
  );
}
