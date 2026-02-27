'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { apiFetch } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface RaceSimulationFormProps {
  raceGoal?: {
    id: string;
    distance: string;
    targetTime: number | null;
    raceName: string | null;
  };
  onSuccess: () => void;
}

export function RaceSimulationForm({ raceGoal, onSuccess }: RaceSimulationFormProps) {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();

  const [name, setName] = useState(raceGoal?.raceName ?? 'Plano Race Day');
  const [targetTimeSec, setTargetTimeSec] = useState(raceGoal?.targetTime ?? 0);
  const [tempC, setTempC] = useState(25);
  const [humidity, setHumidity] = useState(60);

  const mutation = useMutation({
    mutationFn: () =>
      apiFetch('/api/race-nutrition/simulate', {
        method: 'POST',
        token: token ?? undefined,
        body: JSON.stringify({
          raceGoalId: raceGoal?.id,
          name,
          targetTimeSec: targetTimeSec > 0 ? targetTimeSec : undefined,
          distance: raceGoal?.distance,
          weatherConditions: { tempC, humidity },
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['race-nutrition-plans'] });
      onSuccess();
    },
  });

  const hours = Math.floor(targetTimeSec / 3600);
  const minutes = Math.floor((targetTimeSec % 3600) / 60);

  function updateTime(h: number, m: number) {
    setTargetTimeSec(h * 3600 + m * 60);
  }

  const inputClass = 'w-full h-11 px-3 bg-[#283139] border border-slate-700/50 rounded-xl text-slate-100 placeholder:text-slate-500 text-sm outline-none transition-colors focus:border-primary/60 focus:ring-1 focus:ring-primary/20';
  const smallInputClass = 'w-full h-9 px-2 bg-[#283139] border border-slate-700/50 rounded-lg text-slate-100 font-[var(--font-mono)] text-[13px] outline-none transition-colors focus:border-primary/60 focus:ring-1 focus:ring-primary/20';

  return (
    <div className="space-y-5">
      <div>
        <label className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2 block">Nome do plano</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
      </div>

      {raceGoal && (
        <div className="p-3 rounded-xl bg-primary/5 border border-primary/10">
          <p className="text-xs text-slate-400">Prova alvo: <span className="text-primary font-semibold">{raceGoal.raceName ?? raceGoal.distance}</span></p>
        </div>
      )}

      <div>
        <label className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2 block">Tempo alvo</label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-slate-500">Horas</label>
            <input type="number" min={0} max={20} value={hours} onChange={(e) => updateTime(Number(e.target.value), minutes)} className={smallInputClass} />
          </div>
          <div>
            <label className="text-[10px] text-slate-500">Minutos</label>
            <input type="number" min={0} max={59} value={minutes} onChange={(e) => updateTime(hours, Number(e.target.value))} className={smallInputClass} />
          </div>
        </div>
      </div>

      <div>
        <label className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2 block">Condicoes climaticas</label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-slate-500">Temp (C)</label>
            <input type="number" value={tempC} onChange={(e) => setTempC(Number(e.target.value))} className={smallInputClass} />
          </div>
          <div>
            <label className="text-[10px] text-slate-500">Umidade (%)</label>
            <input type="number" min={0} max={100} value={humidity} onChange={(e) => setHumidity(Number(e.target.value))} className={smallInputClass} />
          </div>
        </div>
      </div>

      {mutation.isError && (
        <p className="text-[13px] text-red-400">Erro ao gerar simulacao. Tente novamente.</p>
      )}

      <Button variant="primary" fullWidth onClick={() => mutation.mutate()} loading={mutation.isPending} className="gap-2">
        <span className="material-symbols-outlined text-lg">auto_awesome</span>
        Simular Nutricao Race Day
      </Button>
    </div>
  );
}
