'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { apiFetch, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/field';

interface CreateRaceFormProps {
  onClose: () => void;
}

const distanceOptions = [
  { value: 'sprint', label: 'Sprint', desc: '750m / 20km / 5km' },
  { value: 'olympic', label: 'Olimpico', desc: '1.5km / 40km / 10km' },
  { value: '70.3', label: '70.3', desc: '1.9km / 90km / 21.1km' },
  { value: 'full', label: 'Ironman', desc: '3.8km / 180km / 42.2km' },
];

function formatTimeInput(totalSec: number): { h: number; m: number } {
  return { h: Math.floor(totalSec / 3600), m: Math.floor((totalSec % 3600) / 60) };
}

export function CreateRaceForm({ onClose }: CreateRaceFormProps) {
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();

  const [raceName, setRaceName] = useState('');
  const [distance, setDistance] = useState('70.3');
  const [raceDate, setRaceDate] = useState('');
  const [goal, setGoal] = useState<'finish' | 'time'>('time');
  const [targetH, setTargetH] = useState(5);
  const [targetM, setTargetM] = useState(30);
  const [bikeElevation, setBikeElevation] = useState('');
  const [runElevation, setRunElevation] = useState('');

  const mutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch('/api/athlete/race-goal', {
        method: 'POST',
        token: token ?? undefined,
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      onClose();
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!raceDate) return;

    const targetTime = goal === 'time' ? targetH * 3600 + targetM * 60 : null;
    mutation.mutate({
      raceName: raceName || null,
      distance,
      raceDate,
      goal,
      targetTime,
      bikeElevationGainM: bikeElevation ? Number(bikeElevation) : null,
      runElevationGainM: runElevation ? Number(runElevation) : null,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-bg-surface rounded-t-[2rem] p-6 animate-slide-up max-h-[85dvh] overflow-y-auto">
        {/* Handle */}
        <div className="w-10 h-1 bg-slate-600 rounded-full mx-auto mb-5" />

        <h2 className="font-heading text-xl font-bold text-slate-100 mb-1">Cadastrar Prova Alvo</h2>
        <p className="text-sm text-slate-400 mb-6">Defina sua proxima prova para acompanhar a preparacao</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Race name */}
          <Field label="Nome da prova">
            <Input
              type="text"
              value={raceName}
              onChange={(e) => setRaceName(e.target.value)}
              placeholder="Ex: Ironman 70.3 Florianopolis"
            />
          </Field>

          {/* Distance */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 block">
              Distancia
            </label>
            <div className="grid grid-cols-2 gap-2">
              {distanceOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setDistance(opt.value)}
                  className={cn(
                    'rounded-xl p-3 text-left border transition-all',
                    distance === opt.value
                      ? 'bg-primary/15 border-primary/40 ring-1 ring-primary/20'
                      : 'bg-bg-elevated border-slate-700 hover:border-slate-600',
                  )}
                >
                  <p className={cn(
                    'text-sm font-bold',
                    distance === opt.value ? 'text-primary' : 'text-slate-200',
                  )}>
                    {opt.label}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Date */}
          <Field label="Data da prova">
            <Input
              type="date"
              value={raceDate}
              onChange={(e) => setRaceDate(e.target.value)}
              required
              min={new Date().toISOString().split('T')[0]}
            />
          </Field>

          {/* Goal type */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 block">
              Objetivo
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setGoal('time')}
                className={cn(
                  'flex-1 h-12 rounded-xl border text-sm font-bold transition-all',
                  goal === 'time'
                    ? 'bg-primary/15 border-primary/40 text-primary'
                    : 'bg-bg-elevated border-slate-700 text-slate-400 hover:border-slate-600',
                )}
              >
                Tempo alvo
              </button>
              <button
                type="button"
                onClick={() => setGoal('finish')}
                className={cn(
                  'flex-1 h-12 rounded-xl border text-sm font-bold transition-all',
                  goal === 'finish'
                    ? 'bg-primary/15 border-primary/40 text-primary'
                    : 'bg-bg-elevated border-slate-700 text-slate-400 hover:border-slate-600',
                )}
              >
                Completar
              </button>
            </div>
          </div>

          {/* Target time */}
          {goal === 'time' && (
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 block">
                Tempo alvo
              </label>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 bg-bg-input border border-slate-700 rounded-xl px-4 h-12">
                    <input
                      type="number"
                      value={targetH}
                      onChange={(e) => setTargetH(Math.max(0, Math.min(20, Number(e.target.value))))}
                      min={0}
                      max={20}
                      className="w-12 bg-transparent text-white text-center font-mono text-lg font-bold focus:outline-none"
                    />
                    <span className="text-slate-500 text-sm">horas</span>
                  </div>
                </div>
                <span className="text-slate-500 font-bold text-xl">:</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 bg-bg-input border border-slate-700 rounded-xl px-4 h-12">
                    <input
                      type="number"
                      value={targetM}
                      onChange={(e) => setTargetM(Math.max(0, Math.min(59, Number(e.target.value))))}
                      min={0}
                      max={59}
                      className="w-12 bg-transparent text-white text-center font-mono text-lg font-bold focus:outline-none"
                    />
                    <span className="text-slate-500 text-sm">min</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Elevation (optional) */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 block">
              Altimetria do percurso (opcional)
            </label>
            <p className="text-[10px] text-slate-500 mb-3">Ganho de elevacao acumulado — melhora a precisao da previsao de tempo</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex items-center gap-2 bg-bg-input border border-slate-700 rounded-xl px-4 h-12 focus-within:border-primary transition-colors">
                  <span className="material-symbols-outlined text-base text-bike">directions_bike</span>
                  <input
                    type="number"
                    value={bikeElevation}
                    onChange={(e) => setBikeElevation(e.target.value)}
                    placeholder="Bike"
                    min={0}
                    max={5000}
                    className="flex-1 bg-transparent text-white font-mono text-sm font-bold focus:outline-none placeholder:text-slate-600"
                  />
                  <span className="text-slate-500 text-xs">m</span>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 bg-bg-input border border-slate-700 rounded-xl px-4 h-12 focus-within:border-primary transition-colors">
                  <span className="material-symbols-outlined text-base text-run">directions_run</span>
                  <input
                    type="number"
                    value={runElevation}
                    onChange={(e) => setRunElevation(e.target.value)}
                    placeholder="Run"
                    min={0}
                    max={3000}
                    className="flex-1 bg-transparent text-white font-mono text-sm font-bold focus:outline-none placeholder:text-slate-600"
                  />
                  <span className="text-slate-500 text-xs">m</span>
                </div>
              </div>
            </div>
          </div>

          {/* Error */}
          {mutation.isError && (
            <p className="text-sm text-danger">Erro ao cadastrar prova. Tente novamente.</p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" size="lg" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={mutation.isPending}
              className="flex-1"
              disabled={!raceDate}
            >
              Salvar
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
