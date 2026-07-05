'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { apiFetch, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { RaceSimulationForm } from '@/components/nutrition/race-simulation-form';
import { RacePlanTimeline } from '@/components/nutrition/race-plan-timeline';
import { RacePlanCard } from '@/components/nutrition/race-plan-card';

interface RacePlan {
  id: string;
  name: string;
  status: string;
  targetTimeSec: number | null;
  plan: { phases: Array<{ discipline: string; durationMin: number; items: Array<{ productName: string; minuteOffset?: number; quantity?: number; unit?: string; carbsG?: number; sodiumMg?: number }> }>; notes?: string[]; riskFactors?: string[] };
  totals: { totalCarbsG: number; totalSodiumMg: number; totalCaffeineMg: number; totalKcal: number } | null;
  createdAt: string;
}

interface DashboardData {
  data: {
    raceGoal: { name: string; date: string; daysRemaining: number } | null;
  };
}

export default function RaceDayPage() {
  const { token } = useAuthStore();
  const [showForm, setShowForm] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  const dashboardQuery = useQuery<DashboardData>({
    queryKey: ['dashboard-summary'],
    queryFn: () => apiFetch<DashboardData>('/api/dashboard/summary', { token: token ?? undefined }),
    enabled: !!token,
  });

  const plansQuery = useQuery<{ data: RacePlan[] }>({
    queryKey: ['race-nutrition-plans'],
    queryFn: () => apiFetch<{ data: RacePlan[] }>('/api/race-nutrition/plans', { token: token ?? undefined }),
    enabled: !!token,
  });

  const plans = plansQuery.data?.data ?? [];
  const selectedPlan = plans.find((p) => p.id === selectedPlanId);

  return (
    <div className="py-6 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/nutricao" className="flex items-center justify-center w-11 h-11 rounded-full bg-bg-surface border border-slate-800/50 text-slate-400 hover:text-slate-100 transition-colors shrink-0">
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
        </Link>
        <h1 className="font-heading font-bold text-2xl text-text-primary">Race Day Simulator</h1>
      </div>

      {/* Race goal context */}
      {dashboardQuery.data?.data?.raceGoal && (
        <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-lg text-primary">flag</span>
            <span className="text-sm font-medium text-primary">{dashboardQuery.data.data.raceGoal.name}</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">{dashboardQuery.data.data.raceGoal.daysRemaining} dias restantes</p>
        </div>
      )}

      {/* New simulation button */}
      <Button variant="primary" fullWidth onClick={() => setShowForm(true)} className="gap-2">
        <span className="material-symbols-outlined text-lg">add</span>
        Nova Simulacao
      </Button>

      {/* Plans list */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Meus Planos</h2>
        {plansQuery.isLoading && (
          <div className="space-y-3">
            {[1, 2].map((i) => (<div key={i} className="h-28 rounded-2xl bg-bg-surface animate-pulse" />))}
          </div>
        )}
        {!plansQuery.isLoading && plans.length === 0 && (
          <div className="flex flex-col items-center py-12 space-y-3">
            <span className="material-symbols-outlined text-3xl text-slate-500">restaurant</span>
            <p className="text-sm text-slate-400 text-center">Nenhum plano criado. Simule sua estrategia para o dia da prova.</p>
          </div>
        )}
        {plans.map((plan) => (
          <RacePlanCard key={plan.id} plan={plan} onSelect={setSelectedPlanId} />
        ))}
      </section>

      {/* Simulation form sheet */}
      <BottomSheet open={showForm} onClose={() => setShowForm(false)} title="Simular Nutricao Race Day">
        <RaceSimulationForm onSuccess={() => setShowForm(false)} />
      </BottomSheet>

      {/* Plan detail sheet */}
      <BottomSheet
        open={!!selectedPlan}
        onClose={() => setSelectedPlanId(null)}
        title={selectedPlan?.name ?? 'Detalhes'}
      >
        {selectedPlan && (
          <div className="space-y-5 max-h-[70vh] overflow-y-auto">
            <RacePlanTimeline phases={selectedPlan.plan?.phases ?? []} />

            {/* Totals */}
            {selectedPlan.totals && (
              <div className="flex gap-2">
                {[
                  { value: selectedPlan.totals.totalCarbsG, unit: 'g', label: 'CARB' },
                  { value: selectedPlan.totals.totalSodiumMg, unit: 'mg', label: 'SODIO' },
                  { value: selectedPlan.totals.totalKcal, unit: '', label: 'KCAL' },
                ].map((item) => (
                  <div key={item.label} className="flex-1 text-center py-2.5 rounded-xl bg-bg-elevated border border-slate-800/50">
                    <p className="font-[var(--font-mono)] font-bold text-sm text-white">{Math.round(Number(item.value ?? 0))}<span className="text-[10px] text-slate-500">{item.unit}</span></p>
                    <p className="text-[8px] font-bold uppercase tracking-widest text-slate-500 mt-0.5">{item.label}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Notes */}
            {selectedPlan.plan?.notes && selectedPlan.plan.notes.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Dicas</p>
                {selectedPlan.plan.notes.map((note, i) => (
                  <p key={i} className="text-sm text-slate-300 pl-3 border-l-2 border-primary/30">{note}</p>
                ))}
              </div>
            )}

            {/* Risk factors */}
            {selectedPlan.plan?.riskFactors && selectedPlan.plan.riskFactors.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400/60">Fatores de risco</p>
                {selectedPlan.plan.riskFactors.map((risk, i) => (
                  <div key={i} className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
                    <span className="material-symbols-outlined text-sm text-amber-400 shrink-0 mt-0.5">warning</span>
                    <p className="text-sm text-slate-300">{risk}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </BottomSheet>

      <div className="h-4" />
    </div>
  );
}
