'use client';

import { useQuery } from '@tanstack/react-query';
import { format, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { useAuthStore } from '@/stores/auth-store';
import { apiFetch, cn } from '@/lib/utils';

interface RaceGoalItem {
  id: string;
  raceName: string | null;
  raceDate: string;
  distance: string;
  priority: string | null;
  location: string | null;
}

const DISTANCE_LABELS: Record<string, string> = {
  sprint: 'Sprint',
  olympic: 'Olímpico',
  '70.3': 'Ironman 70.3',
  full: 'Ironman',
  run_5k: '5k',
  run_10k: '10k',
  run_21k: 'Meia (21k)',
  run_42k: 'Maratona',
  bike_event: 'Ciclismo',
  swim_event: 'Natação',
  other: 'Prova',
};

const PRIORITY_CLS: Record<string, string> = {
  A: 'bg-primary text-white',
  B: 'bg-warning/90 text-black',
  C: 'bg-text-faint text-text-primary',
};

/**
 * Próximas provas do calendário (B/C). A prova alvo (A) já aparece no
 * TargetRaceCard, então aqui mostramos o restante do calendário.
 */
export function UpcomingRacesCard() {
  const token = useAuthStore((s) => s.token);

  const { data } = useQuery<{ data: RaceGoalItem[] }>({
    queryKey: ['race-goals'],
    queryFn: () => apiFetch<{ data: RaceGoalItem[] }>('/api/athlete/race-goals', { token: token ?? undefined }),
    enabled: !!token,
  });

  const today = new Date();
  const races = (data?.data ?? [])
    .filter((r) => (r.priority ?? 'A') !== 'A')
    .filter((r) => differenceInDays(parseISO(r.raceDate), today) >= -1)
    .sort((a, b) => a.raceDate.localeCompare(b.raceDate));

  if (races.length === 0) return null;

  return (
    <div className="rounded-card bg-bg-surface p-5 border border-hairline shadow-card">
      <div className="flex items-center gap-2 mb-3">
        <span className="material-symbols-outlined text-primary text-xl">event</span>
        <h3 className="font-heading text-base font-bold text-text-primary">
          Próximas provas
        </h3>
      </div>
      <div className="space-y-2">
        {races.map((r) => {
          const days = differenceInDays(parseISO(r.raceDate), today);
          return (
            <div key={r.id} className="flex items-center gap-3 py-1">
              <span
                className={cn(
                  'shrink-0 w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs',
                  PRIORITY_CLS[r.priority ?? 'C'] ?? PRIORITY_CLS.C,
                )}
              >
                {r.priority ?? 'C'}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-text-primary font-medium truncate leading-tight">
                  {r.raceName || DISTANCE_LABELS[r.distance] || 'Prova'}
                </p>
                <p className="text-[11px] text-text-secondary truncate">
                  {DISTANCE_LABELS[r.distance] ?? r.distance}
                  {' · '}
                  {format(parseISO(r.raceDate), 'dd MMM', { locale: ptBR })}
                  {r.location ? ` · ${r.location}` : ''}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-[var(--font-mono)] font-bold text-base text-primary leading-none">
                  {days < 0 ? '—' : days}
                </p>
                <p className="text-[9px] text-text-secondary uppercase tracking-wider">
                  {days < 0 ? 'feita' : 'dias'}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
