'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { apiFetch } from '@/lib/utils';

interface Bike {
  id: string;
  name: string;
  isDefault: boolean;
  weightKg: string | null;
}

interface BikeSelectorProps {
  activityId: string;
  currentBikeId: string | null;
}

// Seletor da bike usada na atividade. Trocar → PUT recomputa o CdA a partir
// das streams salvas (sem Strava) e invalida o detalhe pra recarregar o card.
export function BikeSelector({ activityId, currentBikeId }: BikeSelectorProps) {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();

  const bikesQuery = useQuery<{ data: Bike[] }>({
    queryKey: ['bikes'],
    queryFn: () => apiFetch<{ data: Bike[] }>('/api/bikes', { token: token ?? undefined }),
    enabled: !!token,
  });

  const mutation = useMutation({
    mutationFn: (bikeId: string | null) =>
      apiFetch(`/api/activities/${activityId}/bike`, {
        method: 'PUT',
        token: token ?? undefined,
        body: JSON.stringify({ bikeId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activity', activityId] });
    },
  });

  const bikes = bikesQuery.data?.data ?? [];

  // Sem bikes cadastradas: aponta o caminho pra cadastrar.
  if (!bikesQuery.isLoading && bikes.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-card border border-dashed border-border-strong/50 bg-bg-surface px-4 py-3 text-[13px] text-text-muted">
        <span className="material-symbols-outlined text-[18px] text-text-faint">directions_bike</span>
        <span>
          Cadastre sua bike em <span className="text-text-secondary">Configurações → Minhas bikes</span> pra
          calibrar o CdA.
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-card border border-border bg-bg-surface px-4 py-3">
      <span className="material-symbols-outlined text-[18px] text-bike shrink-0">directions_bike</span>
      <span className="text-[13px] text-text-secondary shrink-0">Bike</span>
      <select
        value={currentBikeId ?? ''}
        disabled={mutation.isPending || bikesQuery.isLoading}
        onChange={(e) => mutation.mutate(e.target.value || null)}
        className="flex-1 min-w-0 h-10 rounded-lg border border-border bg-bg-input px-3 text-[14px] text-text-primary outline-none focus:border-border-focus disabled:opacity-60"
      >
        <option value="">Sem bike (setup padrão)</option>
        {bikes.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}{b.isDefault ? ' (padrão)' : ''}
          </option>
        ))}
      </select>
      {mutation.isPending && (
        <span className="text-[12px] text-text-muted shrink-0 animate-pulse">recalculando…</span>
      )}
    </div>
  );
}
