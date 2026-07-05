'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { apiFetch } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/field';

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

  return (
    <div className="space-y-5">
      <Field label="Nome do plano">
        <Input type="text" value={name} onChange={(e) => setName(e.target.value)} />
      </Field>

      {raceGoal && (
        <div className="p-3 rounded-xl bg-primary/5 border border-primary/10">
          <p className="text-xs text-slate-400">Prova alvo: <span className="text-primary font-semibold">{raceGoal.raceName ?? raceGoal.distance}</span></p>
        </div>
      )}

      <div>
        <label className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2 block">Tempo alvo</label>
        <div className="grid grid-cols-2 gap-x-3 gap-y-4">
          <Field label="Horas">
            <Input size="sm" type="number" min={0} max={20} value={hours} onChange={(e) => updateTime(Number(e.target.value), minutes)} className="font-[var(--font-mono)]" />
          </Field>
          <Field label="Minutos">
            <Input size="sm" type="number" min={0} max={59} value={minutes} onChange={(e) => updateTime(hours, Number(e.target.value))} className="font-[var(--font-mono)]" />
          </Field>
        </div>
      </div>

      <div>
        <label className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2 block">Condicoes climaticas</label>
        <div className="grid grid-cols-2 gap-x-3 gap-y-4">
          <Field label="Temp (C)">
            <Input size="sm" type="number" value={tempC} onChange={(e) => setTempC(Number(e.target.value))} className="font-[var(--font-mono)]" />
          </Field>
          <Field label="Umidade (%)">
            <Input size="sm" type="number" min={0} max={100} value={humidity} onChange={(e) => setHumidity(Number(e.target.value))} className="font-[var(--font-mono)]" />
          </Field>
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
