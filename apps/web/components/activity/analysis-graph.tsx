'use client';

import dynamic from 'next/dynamic';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import type { ActivityStreamsResponse } from './analysis-types';

const AnalysisGraphInner = dynamic(() => import('./analysis-graph-inner'), { ssr: false });

interface AnalysisGraphProps {
  activityId: string;
}

function GraphSkeleton() {
  return <div className="h-64 rounded-card bg-bg-surface border border-border animate-pulse" />;
}

export function AnalysisGraph({ activityId }: AnalysisGraphProps) {
  const { token } = useAuthStore();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['activity-streams', activityId],
    queryFn: () =>
      apiFetch<{ data: ActivityStreamsResponse }>(`/api/activities/${activityId}/streams`, {
        token: token ?? undefined,
      }),
    enabled: !!token && !!activityId,
    staleTime: Infinity,
  });

  if (isLoading) return <GraphSkeleton />;

  if (isError || !data) {
    return (
      <div className="flex flex-col items-center py-10 space-y-3">
        <span className="material-symbols-outlined text-[32px] text-text-faint">show_chart</span>
        <p className="font-body text-sm text-text-muted text-center">Sem dados de série temporal para o gráfico.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="h-64 rounded-card bg-bg-surface border border-border p-3">
        <AnalysisGraphInner streams={data.data} />
      </div>
      <div className="flex items-center justify-center gap-4 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 rounded bg-[#2196f5]" />
          <span className="text-[10px] text-text-muted">Potência</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 rounded bg-[#f0524e]" />
          <span className="text-[10px] text-text-muted">FC</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 rounded bg-[#f5a524] opacity-60" />
          <span className="text-[10px] text-text-muted">Cadência</span>
        </div>
      </div>
    </div>
  );
}
