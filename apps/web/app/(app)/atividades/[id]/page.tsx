'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Clock,
  MapPin,
  Heart,
  Plus,
  AlertTriangle,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { useAuthStore } from '@/stores/auth-store';
import { apiFetch, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { DisciplineBadge } from '@/components/ui/discipline-badge';
import { PhaseTag } from '@/components/ui/phase-tag';
import { StatCard } from '@/components/ui/stat-card';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { LogSupplementSheet } from '@/components/nutrition/log-supplement-sheet';

/* ---------- Types ---------- */

type Discipline = 'swim' | 'bike' | 'run' | 'brick';
type Phase = 'pre' | 'during' | 'post';

interface NutritionItem {
  id: string;
  phase: Phase;
  product: string;
  quantity: string;
  carbsG: number;
  sodiumMg: number;
  caffeineMg?: number;
  kcal?: number;
  minuteOffset: number;
}

interface ActivityDetail {
  data: {
    id: string;
    title: string;
    discipline: Discipline;
    date: string;
    duration: string;
    distance?: string;
    avgHeartRate?: number;
    nutrition: NutritionItem[];
    totals: {
      carbsG: number;
      sodiumMg: number;
      caffeineMg: number;
      kcal: number;
    };
  };
}

const adverseEvents = [
  'Nausea',
  'Caimbra',
  'Desconforto GI',
  'Fadiga excessiva',
  'Tontura',
  'Dor de cabeca',
  'Outro',
];

/* ---------- Skeletons ---------- */

function DetailSkeleton() {
  return (
    <div className="py-6 space-y-6 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-bg-surface" />
        <div className="h-6 w-48 rounded bg-bg-surface" />
      </div>
      <div className="flex items-center gap-2">
        <div className="h-6 w-20 rounded-full bg-bg-surface" />
        <div className="h-4 w-32 rounded bg-bg-surface" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-lg bg-bg-surface" />
        ))}
      </div>
      <div className="h-4 w-24 rounded bg-bg-surface" />
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 rounded-lg bg-bg-surface" />
        ))}
      </div>
    </div>
  );
}

/* ---------- Page ---------- */

export default function ActivityDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { token } = useAuthStore();

  const [showLogSheet, setShowLogSheet] = useState(false);
  const [showAdverseSheet, setShowAdverseSheet] = useState(false);
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);

  const { data, isLoading, isError, refetch } = useQuery<ActivityDetail>({
    queryKey: ['activity', params.id],
    queryFn: () =>
      apiFetch<ActivityDetail>(`/api/activities/${params.id}`, {
        token: token ?? undefined,
      }),
    enabled: !!token && !!params.id,
  });

  const activity = data?.data;

  /* Group nutrition by phase */
  const nutritionByPhase = activity?.nutrition.reduce(
    (acc, item) => {
      if (!acc[item.phase]) acc[item.phase] = [];
      acc[item.phase].push(item);
      return acc;
    },
    {} as Record<Phase, NutritionItem[]>,
  );

  const phases: Phase[] = ['pre', 'during', 'post'];

  function toggleEvent(event: string) {
    setSelectedEvents((prev) =>
      prev.includes(event)
        ? prev.filter((e) => e !== event)
        : [...prev, event],
    );
  }

  async function handleReportAdverse() {
    if (selectedEvents.length === 0) return;
    try {
      await apiFetch(`/api/activities/${params.id}/adverse-events`, {
        method: 'POST',
        token: token ?? undefined,
        body: JSON.stringify({ events: selectedEvents }),
      });
      setShowAdverseSheet(false);
      setSelectedEvents([]);
      refetch();
    } catch {
      // silently fail - user can retry
    }
  }

  if (isLoading) return <DetailSkeleton />;

  if (isError || !activity) {
    return (
      <div className="py-6 space-y-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft size={20} />
          <span className="font-body text-[14px]">Voltar</span>
        </button>
        <div className="flex flex-col items-center justify-center py-16 space-y-3">
          <p className="font-body text-[15px] text-text-secondary">
            Erro ao carregar atividade.
          </p>
          <Button variant="ghost" onClick={() => refetch()}>
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  const formattedDate = format(parseISO(activity.date), "dd MMM yyyy · HH:mm", {
    locale: ptBR,
  });

  return (
    <div className="py-6 space-y-6">
      {/* Back + title */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="flex items-center justify-center w-8 h-8 rounded-full bg-bg-surface text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="font-heading font-bold text-[24px] text-text-primary truncate">
          {activity.title}
        </h1>
      </div>

      {/* Discipline + date */}
      <div className="flex items-center gap-3">
        <DisciplineBadge discipline={activity.discipline} size="md" />
        <span className="font-body text-[13px] text-text-secondary">
          {formattedDate}
        </span>
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          label="Duracao"
          value={activity.duration}
          className="text-center"
        />
        <StatCard
          label="Distancia"
          value={activity.distance ?? '--'}
          className="text-center"
        />
        <StatCard
          label="FC Media"
          value={activity.avgHeartRate ?? '--'}
          unit={activity.avgHeartRate ? 'bpm' : undefined}
          className="text-center"
        />
      </div>

      {/* Nutrition section */}
      <div className="space-y-4">
        <h2 className="font-heading font-semibold text-[18px] text-text-primary">
          Nutricao
        </h2>

        {activity.nutrition.length === 0 && (
          <p className="font-body text-[14px] text-text-muted py-4 text-center">
            Nenhum consumo registrado.
          </p>
        )}

        {phases.map((phase) => {
          const items = nutritionByPhase?.[phase];
          if (!items || items.length === 0) return null;

          return (
            <div key={phase} className="space-y-2">
              <PhaseTag phase={phase} />
              <div className="space-y-1.5">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 bg-bg-surface border border-border rounded-lg"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-body text-[14px] text-text-primary font-medium truncate">
                        {item.product}
                      </p>
                      <p className="font-body text-[12px] text-text-muted">
                        {item.quantity}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-mono text-[12px] text-text-secondary">
                        {item.carbsG}g carb
                      </span>
                      <span className="font-mono text-[12px] text-text-secondary">
                        {item.sodiumMg}mg Na
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* Totals row */}
        {activity.nutrition.length > 0 && (
          <div className="grid grid-cols-4 gap-2 p-3 bg-bg-surface border border-border rounded-lg">
            <div className="text-center">
              <p className="font-body text-[10px] text-text-muted uppercase tracking-wider">
                Carbo
              </p>
              <p className="font-mono font-bold text-[16px] text-text-primary">
                {activity.totals.carbsG}g
              </p>
            </div>
            <div className="text-center">
              <p className="font-body text-[10px] text-text-muted uppercase tracking-wider">
                Sodio
              </p>
              <p className="font-mono font-bold text-[16px] text-text-primary">
                {activity.totals.sodiumMg}mg
              </p>
            </div>
            <div className="text-center">
              <p className="font-body text-[10px] text-text-muted uppercase tracking-wider">
                Cafeina
              </p>
              <p className="font-mono font-bold text-[16px] text-text-primary">
                {activity.totals.caffeineMg}mg
              </p>
            </div>
            <div className="text-center">
              <p className="font-body text-[10px] text-text-muted uppercase tracking-wider">
                Kcal
              </p>
              <p className="font-mono font-bold text-[16px] text-text-primary">
                {activity.totals.kcal}
              </p>
            </div>
          </div>
        )}

        {/* Add consumption button */}
        <Button
          variant="ghost"
          fullWidth
          onClick={() => setShowLogSheet(true)}
        >
          <Plus size={16} />
          Adicionar consumo
        </Button>
      </div>

      {/* Adverse event link */}
      <button
        onClick={() => setShowAdverseSheet(true)}
        className="flex items-center gap-2 text-text-secondary hover:text-warning transition-colors font-body text-[14px]"
      >
        <AlertTriangle size={16} />
        Relatar evento adverso
      </button>

      {/* Log supplement bottom sheet */}
      <LogSupplementSheet
        activityId={params.id}
        open={showLogSheet}
        onClose={() => setShowLogSheet(false)}
        onSuccess={() => {
          setShowLogSheet(false);
          refetch();
        }}
      />

      {/* Adverse event bottom sheet */}
      <BottomSheet
        open={showAdverseSheet}
        onClose={() => {
          setShowAdverseSheet(false);
          setSelectedEvents([]);
        }}
        title="Relatar evento adverso"
      >
        <div className="space-y-3">
          <p className="font-body text-[14px] text-text-secondary">
            Selecione os eventos que ocorreram durante esta atividade:
          </p>
          <div className="space-y-2">
            {adverseEvents.map((event) => (
              <label
                key={event}
                className="flex items-center gap-3 p-3 bg-bg-surface border border-border rounded-lg cursor-pointer hover:bg-bg-elevated transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedEvents.includes(event)}
                  onChange={() => toggleEvent(event)}
                  className="w-5 h-5 rounded border-border accent-primary"
                />
                <span className="font-body text-[14px] text-text-primary">
                  {event}
                </span>
              </label>
            ))}
          </div>
          <div className="flex gap-3 pt-4">
            <Button
              variant="secondary"
              fullWidth
              onClick={() => {
                setShowAdverseSheet(false);
                setSelectedEvents([]);
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              fullWidth
              onClick={handleReportAdverse}
              disabled={selectedEvents.length === 0}
            >
              Enviar
            </Button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
