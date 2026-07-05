'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { apiFetch } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface QuickLogButtonsProps {
  activityId: string;
  protocolId: string | null;
  hasLog: boolean;
  onLogDifferences: () => void;
}

export function QuickLogButtons({
  activityId,
  protocolId,
  hasLog,
  onLogDifferences,
}: QuickLogButtonsProps) {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();

  const followMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/api/nutrition/log/${activityId}/follow-protocol`, {
        method: 'POST',
        token: token ?? undefined,
        body: JSON.stringify({ protocolId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activity', activityId] });
      queryClient.invalidateQueries({ queryKey: ['nutrition-comparison', activityId] });
    },
  });

  if (!protocolId) return null;

  if (hasLog) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 rounded-full bg-success/10 border border-success/20">
        <span className="material-symbols-outlined text-lg text-success">check_circle</span>
        <span className="text-sm font-medium text-success">Nutricao registrada</span>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <Button
        variant="primary"
        fullWidth
        onClick={() => followMutation.mutate()}
        loading={followMutation.isPending}
        className="gap-2"
      >
        <span className="material-symbols-outlined text-lg">check</span>
        Segui Exatamente
      </Button>
      <Button
        variant="secondary"
        fullWidth
        onClick={onLogDifferences}
        className="gap-2"
      >
        <span className="material-symbols-outlined text-lg">edit</span>
        Registrar Diferencas
      </Button>
    </div>
  );
}
