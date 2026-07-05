'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { apiFetch, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { NutritionTimeline } from '@/components/ui/nutrition-timeline';
import { CustomizeProtocolSheet } from './customize-protocol-sheet';

/* ── Types ── */

interface ProtocolItem {
  phase: 'pre' | 'during' | 'post';
  minuteOffset: number;
  productName: string;
  brand?: string;
  quantity?: number;
  unit?: string;
  carbsG?: number;
  sodiumMg?: number;
  caffeineMg?: number;
  kcal?: number;
}

interface Protocol {
  id: string;
  status: string | null;
  items: ProtocolItem[];
  totalCarbsG: string | null;
  totalSodiumMg: string | null;
  totalCaffeineMg: string | null;
  totalKcal: number | null;
}

interface DailyNutritionCardProps {
  workoutId: string;
  protocol: Protocol | null;
  discipline: string;
}

/* ── Status Badge ── */

function StatusBadge({ status }: { status: string | null }) {
  const config: Record<string, { label: string; bg: string; text: string }> = {
    generated: { label: 'Gerado por IA', bg: 'bg-info/15', text: 'text-info' },
    accepted: { label: 'Aceito', bg: 'bg-success/15', text: 'text-success' },
    customized: { label: 'Personalizado', bg: 'bg-warning/15', text: 'text-warning' },
  };
  const c = config[status ?? 'generated'] ?? config.generated!;

  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider', c.bg, c.text)}>
      {status === 'accepted' && <span className="material-symbols-outlined text-[12px]">check_circle</span>}
      {c.label}
    </span>
  );
}

/* ── Component ── */

export function DailyNutritionCard({ workoutId, protocol, discipline }: DailyNutritionCardProps) {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  const [showCustomize, setShowCustomize] = useState(false);

  const generateMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/api/nutrition-planner/generate/${workoutId}`, {
        method: 'POST',
        token: token ?? undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });

  const acceptMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/api/nutrition-planner/accept/${protocol?.id}`, {
        method: 'POST',
        token: token ?? undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });

  const applyPresetMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/api/nutrition-planner/apply-preset/${workoutId}`, {
        method: 'POST',
        token: token ?? undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });

  const isLoading = generateMutation.isPending || acceptMutation.isPending || applyPresetMutation.isPending;

  /* ── No protocol state ── */
  if (!protocol) {
    return (
      <div className="rounded-card bg-bg-surface p-5 border border-hairline shadow-card">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/15">
            <span className="material-symbols-outlined text-xl text-primary">nutrition</span>
          </div>
          <h3 className="font-heading font-bold text-base text-text-primary">
            Nutricao do Dia
          </h3>
        </div>

        <p className="text-sm text-text-secondary mb-5">
          Nenhum protocolo nutricional definido para este treino. Gere um plano personalizado com IA.
        </p>

        <div className="flex gap-3">
          <Button
            variant="primary"
            fullWidth
            onClick={() => generateMutation.mutate()}
            loading={generateMutation.isPending}
            className="gap-2"
          >
            <span className="material-symbols-outlined text-lg">auto_awesome</span>
            Gerar Nutricao
          </Button>
          <Button
            variant="secondary"
            onClick={() => applyPresetMutation.mutate()}
            loading={applyPresetMutation.isPending}
            className="gap-2 shrink-0"
          >
            <span className="material-symbols-outlined text-lg">inventory_2</span>
            Preset
          </Button>
        </div>

        {generateMutation.isError && (
          <p className="text-[13px] text-danger mt-3">Erro ao gerar protocolo. Tente novamente.</p>
        )}
      </div>
    );
  }

  /* ── With protocol ── */
  const items: ProtocolItem[] = Array.isArray(protocol.items) ? protocol.items : [];
  const timelineItems = items.map((item) => ({
    phase: item.phase as 'pre' | 'during' | 'post',
    minuteOffset: item.minuteOffset ?? 0,
    product: item.productName,
    detail: item.quantity ? `${item.quantity}${item.unit ?? ''}` : undefined,
  }));

  const isAccepted = protocol.status === 'accepted' || protocol.status === 'customized';

  return (
    <>
      <div className="rounded-card bg-bg-surface p-5 border border-hairline shadow-card">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/15">
              <span className="material-symbols-outlined text-xl text-primary">nutrition</span>
            </div>
            <h3 className="font-heading font-bold text-base text-text-primary">
              Nutricao do Dia
            </h3>
          </div>
          <StatusBadge status={protocol.status} />
        </div>

        {/* Timeline */}
        {timelineItems.length > 0 && (
          <div className="mb-5">
            <NutritionTimeline items={timelineItems} />
          </div>
        )}

        {/* Nutrition Summary */}
        <div className="flex items-center gap-2 mb-5">
          {[
            { value: protocol.totalCarbsG, unit: 'g', label: 'CARB' },
            { value: protocol.totalSodiumMg, unit: 'mg', label: 'SODIO' },
            { value: protocol.totalCaffeineMg, unit: 'mg', label: 'CAF' },
            { value: protocol.totalKcal, unit: '', label: 'KCAL' },
          ].map((item) => (
            <div
              key={item.label}
              className="flex-1 text-center py-2.5 rounded-xl bg-bg-elevated border border-border"
            >
              <p className="font-[var(--font-mono)] font-bold text-sm text-white leading-none">
                {Math.round(Number(item.value ?? 0))}
                <span className="text-[10px] text-text-muted font-normal">{item.unit}</span>
              </p>
              <p className="text-[8px] font-bold uppercase tracking-widest text-text-muted mt-0.5">{item.label}</p>
            </div>
          ))}
        </div>

        {/* Items list */}
        <div className="space-y-1.5 mb-5">
          {items.map((item, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-bg-elevated"
            >
              <span className={cn(
                'w-2 h-2 rounded-full shrink-0',
                item.phase === 'pre' ? 'bg-phase-pre' : item.phase === 'during' ? 'bg-phase-during' : 'bg-phase-post',
              )} />
              <span className="text-sm text-text-primary flex-1 truncate">
                {item.productName}
              </span>
              <span className="font-[var(--font-mono)] text-[12px] text-text-secondary shrink-0">
                {item.carbsG ?? 0}g carb
              </span>
            </div>
          ))}
        </div>

        {/* Actions */}
        {!isAccepted ? (
          <div className="flex gap-2">
            <Button
              variant="primary"
              fullWidth
              onClick={() => acceptMutation.mutate()}
              loading={acceptMutation.isPending}
              disabled={isLoading}
              className="gap-2"
            >
              <span className="material-symbols-outlined text-lg">check</span>
              Aceitar Plano
            </Button>
            <Button
              variant="secondary"
              onClick={() => applyPresetMutation.mutate()}
              loading={applyPresetMutation.isPending}
              disabled={isLoading}
              className="gap-2 shrink-0"
            >
              Preset
            </Button>
            <Button
              variant="ghost"
              onClick={() => setShowCustomize(true)}
              disabled={isLoading}
              aria-label="Personalizar protocolo"
              className="gap-2 shrink-0"
            >
              <span className="material-symbols-outlined text-lg">edit</span>
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <div className="flex-1 flex items-center gap-2 px-4 py-3 rounded-full bg-success/10 border border-success/20">
              <span className="material-symbols-outlined text-lg text-success">check_circle</span>
              <span className="text-sm font-medium text-success">Plano aceito</span>
            </div>
            <Button
              variant="ghost"
              onClick={() => setShowCustomize(true)}
              aria-label="Personalizar protocolo"
              className="gap-2 shrink-0"
            >
              <span className="material-symbols-outlined text-lg">edit</span>
            </Button>
          </div>
        )}
      </div>

      {/* Customize Sheet */}
      <CustomizeProtocolSheet
        protocolId={protocol.id}
        items={items}
        open={showCustomize}
        onClose={() => setShowCustomize(false)}
        onSuccess={() => {
          setShowCustomize(false);
          queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
        }}
      />
    </>
  );
}
