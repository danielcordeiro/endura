'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { apiFetch } from '@/lib/utils';
import { LogModal } from './log-modal';

interface PendingLog {
  activityId: string;
  plannedWorkoutId: string;
  workoutTitle: string | null;
  scheduledDate: string;
  discipline: string;
  durationSec: number | null;
  protocolId: string;
  startedAt: string;
}

function formatDuration(sec: number | null): string {
  if (!sec) return '';
  const min = Math.round(sec / 60);
  if (min >= 60) return `${Math.floor(min / 60)}h${(min % 60).toString().padStart(2, '0')}`;
  return `${min}min`;
}

export function LogPendingCard() {
  const token = useAuthStore((s) => s.token);
  const [open, setOpen] = useState(false);

  const { data } = useQuery<{ data: PendingLog[] }>({
    queryKey: ['pending-logs'],
    queryFn: () =>
      apiFetch<{ data: PendingLog[] }>('/api/nutrition/log/pending', { token: token ?? undefined }),
    enabled: !!token,
    staleTime: 60_000,
  });

  const pending = data?.data ?? [];
  const first = pending[0];

  if (!first) return null;

  return (
    <>
      <div className="rounded-card bg-bg-surface p-5 ring-1 ring-hairline shadow-card">
        <div className="bg-gradient-to-br from-amber-900/30 to-[#1c242c] rounded-[1.8rem] p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-xl text-amber-400">restaurant</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                Registrar nutricao
              </p>
              <h3 className="font-heading text-lg font-bold text-slate-100 leading-tight mt-0.5 truncate">
                {first.workoutTitle ?? `Treino ${first.discipline}`}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {formatDuration(first.durationSec)}
                {pending.length > 1 && ` · +${pending.length - 1} pendente${pending.length - 1 > 1 ? 's' : ''}`}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setOpen(true)}
          className="mt-3 w-full h-12 rounded-full bg-white text-slate-900 font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition"
        >
          <span className="material-symbols-outlined text-lg">edit_note</span>
          Registrar
        </button>
      </div>

      <LogModal
        open={open}
        onClose={() => setOpen(false)}
        activityId={first.activityId}
        workoutTitle={first.workoutTitle}
        protocolId={first.protocolId}
        scheduledDate={first.scheduledDate}
      />
    </>
  );
}
