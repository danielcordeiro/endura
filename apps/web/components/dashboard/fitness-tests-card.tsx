'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { apiFetch, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

/* ── Types ── */

interface FitnessTest {
  id: string;
  testType: 'swim_t30' | 'bike_ftp20' | 'run_cooper12';
  testDate: string;
  distanceM: number | null;
  avgPowerW: number | null;
  avgHr: number | null;
  derivedPace: number | null;
  derivedFtp: number | null;
  derivedVo2max: number | null;
}

interface FitnessTestsData {
  swim_t30: FitnessTest | null;
  bike_ftp20: FitnessTest | null;
  run_cooper12: FitnessTest | null;
}

type ActiveForm = 'swim_t30' | 'bike_ftp20' | 'run_cooper12' | null;

/* ── Helpers ── */

function formatPace(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

const testConfig = {
  swim_t30: {
    label: 'T30 Natacao',
    desc: 'Distancia nadada em 30 minutos',
    icon: 'pool',
    color: 'text-swim',
    bg: 'bg-swim/15',
    border: 'border-swim/30',
    inputLabel: 'Distancia (metros)',
    inputPlaceholder: 'Ex: 1500',
    unit: 'm',
  },
  bike_ftp20: {
    label: 'FTP 20min Bike',
    desc: 'Potencia media em 20 minutos',
    icon: 'directions_bike',
    color: 'text-bike',
    bg: 'bg-bike/15',
    border: 'border-bike/30',
    inputLabel: 'Potencia media (watts)',
    inputPlaceholder: 'Ex: 250',
    unit: 'W',
  },
  run_cooper12: {
    label: 'Cooper 12min',
    desc: 'Distancia percorrida em 12 minutos',
    icon: 'directions_run',
    color: 'text-run',
    bg: 'bg-run/15',
    border: 'border-run/30',
    inputLabel: 'Distancia (metros)',
    inputPlaceholder: 'Ex: 2800',
    unit: 'm',
  },
};

/* ── Test Result Display ── */

function TestResultRow({ test, type, onNew }: { test: FitnessTest | null; type: keyof typeof testConfig; onNew: () => void }) {
  const config = testConfig[type];

  return (
    <div className={cn('rounded-card-inner border p-4', config.border, 'bg-bg-surface')}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={cn('flex items-center justify-center w-8 h-8 rounded-lg', config.bg)}>
            <span className={cn('material-symbols-outlined text-lg', config.color)}>{config.icon}</span>
          </div>
          <div>
            <p className="text-sm font-bold text-text-primary">{config.label}</p>
            {test && <p className="text-[10px] text-text-muted">{formatDate(test.testDate)}</p>}
          </div>
        </div>
        <button
          onClick={onNew}
          className={cn('flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-all', config.bg, config.color, 'hover:opacity-80 active:scale-95')}
        >
          <span className="material-symbols-outlined text-sm">{test ? 'refresh' : 'add'}</span>
          {test ? 'Novo' : 'Registrar'}
        </button>
      </div>

      {test ? (
        <div className="grid grid-cols-2 gap-2 mt-3">
          {/* Primary metric */}
          {type === 'swim_t30' && test.distanceM && (
            <>
              <div className="bg-bg-elevated rounded-xl p-2.5">
                <p className="text-[10px] text-text-muted mb-0.5">Distancia</p>
                <p className="font-mono text-sm font-bold text-white">{test.distanceM}<span className="text-[10px] text-text-muted"> m</span></p>
              </div>
              <div className="bg-bg-elevated rounded-xl p-2.5">
                <p className="text-[10px] text-text-muted mb-0.5">Pace</p>
                <p className="font-mono text-sm font-bold text-white">{test.derivedPace ? formatPace(test.derivedPace) : '—'}<span className="text-[10px] text-text-muted"> /100m</span></p>
              </div>
            </>
          )}
          {type === 'bike_ftp20' && (
            <>
              <div className="bg-bg-elevated rounded-xl p-2.5">
                <p className="text-[10px] text-text-muted mb-0.5">Potencia 20min</p>
                <p className="font-mono text-sm font-bold text-white">{test.avgPowerW ?? '—'}<span className="text-[10px] text-text-muted"> W</span></p>
              </div>
              <div className="bg-bg-elevated rounded-xl p-2.5">
                <p className="text-[10px] text-text-muted mb-0.5">FTP estimado</p>
                <p className="font-mono text-sm font-bold text-white">{test.derivedFtp ?? '—'}<span className="text-[10px] text-text-muted"> W</span></p>
              </div>
            </>
          )}
          {type === 'run_cooper12' && test.distanceM && (
            <>
              <div className="bg-bg-elevated rounded-xl p-2.5">
                <p className="text-[10px] text-text-muted mb-0.5">Distancia</p>
                <p className="font-mono text-sm font-bold text-white">{test.distanceM}<span className="text-[10px] text-text-muted"> m</span></p>
              </div>
              <div className="bg-bg-elevated rounded-xl p-2.5">
                <p className="text-[10px] text-text-muted mb-0.5">VO2max</p>
                <p className="font-mono text-sm font-bold text-white">{test.derivedVo2max ?? '—'}<span className="text-[10px] text-text-muted"> ml/kg/min</span></p>
              </div>
            </>
          )}
          {test.avgHr && (
            <div className="bg-bg-elevated rounded-xl p-2.5">
              <p className="text-[10px] text-text-muted mb-0.5">FC media</p>
              <p className="font-mono text-sm font-bold text-text-secondary">{test.avgHr}<span className="text-[10px] text-text-muted"> bpm</span></p>
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-text-muted text-center py-3">{config.desc}</p>
      )}
    </div>
  );
}

/* ── Inline Form ── */

function TestForm({ type, onClose }: { type: ActiveForm; onClose: () => void }) {
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();
  const [value, setValue] = useState('');
  const [hr, setHr] = useState('');
  const [testDate, setTestDate] = useState(new Date().toISOString().split('T')[0]!);

  const config = type ? testConfig[type] : null;

  const mutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch('/api/fitness-tests', {
        method: 'POST',
        token: token ?? undefined,
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fitness-tests'] });
      queryClient.invalidateQueries({ queryKey: ['performance-dashboard'] });
      onClose();
    },
  });

  if (!type || !config) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const numValue = Number(value);
    if (!numValue || numValue <= 0) return;

    const body: Record<string, unknown> = {
      testType: type,
      testDate,
      avgHr: hr ? Number(hr) : null,
    };

    if (type === 'bike_ftp20') {
      body.avgPowerW = numValue;
      body.durationSec = 1200;
    } else {
      body.distanceM = numValue;
      body.durationSec = type === 'swim_t30' ? 1800 : 720;
    }

    mutation.mutate(body);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-bg-surface rounded-t-[2rem] p-6 animate-slide-up">
        <div className="w-10 h-1 bg-bg-elevated rounded-full mx-auto mb-5" />

        <div className="flex items-center gap-3 mb-5">
          <div className={cn('flex items-center justify-center w-10 h-10 rounded-xl', config.bg)}>
            <span className={cn('material-symbols-outlined text-2xl', config.color)}>{config.icon}</span>
          </div>
          <div>
            <h2 className="font-heading text-lg font-bold text-text-primary">{config.label}</h2>
            <p className="text-xs text-text-secondary">{config.desc}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-2 block">Data do teste</label>
            <input
              type="date"
              value={testDate}
              onChange={(e) => setTestDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="w-full h-12 bg-bg-input border border-border-strong rounded-xl px-4 text-sm text-white focus:border-primary focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-2 block">{config.inputLabel}</label>
            <div className="flex items-center gap-2 bg-bg-input border border-border-strong rounded-xl px-4 h-14 focus-within:border-primary transition-colors">
              <input
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={config.inputPlaceholder}
                required
                autoFocus
                className="flex-1 bg-transparent text-white font-mono text-xl font-bold focus:outline-none placeholder:text-text-muted"
              />
              <span className="text-text-muted text-sm font-bold">{config.unit}</span>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-2 block">FC media (opcional)</label>
            <div className="flex items-center gap-2 bg-bg-input border border-border-strong rounded-xl px-4 h-12 focus-within:border-primary transition-colors">
              <input
                type="number"
                value={hr}
                onChange={(e) => setHr(e.target.value)}
                placeholder="Ex: 165"
                className="flex-1 bg-transparent text-white font-mono text-lg focus:outline-none placeholder:text-text-muted"
              />
              <span className="text-text-muted text-sm">bpm</span>
            </div>
          </div>

          {/* Preview derived values */}
          {value && Number(value) > 0 && (
            <div className="bg-bg-elevated rounded-xl p-3 flex items-center gap-3">
              <span className="material-symbols-outlined text-base text-primary">calculate</span>
              <div className="text-xs text-text-secondary">
                {type === 'swim_t30' && (
                  <>Pace estimado: <span className="font-mono font-bold text-white">{formatPace((30 * 60 / Number(value)) * 100)}/100m</span></>
                )}
                {type === 'bike_ftp20' && (
                  <>FTP estimado: <span className="font-mono font-bold text-white">{Math.round(Number(value) * 0.95)}W</span> (95% de {value}W)</>
                )}
                {type === 'run_cooper12' && (
                  <>VO2max: <span className="font-mono font-bold text-white">{((Number(value) - 504.9) / 44.73).toFixed(1)}</span> ml/kg/min</>
                )}
              </div>
            </div>
          )}

          {mutation.isError && (
            <p className="text-sm text-danger">Erro ao salvar. Tente novamente.</p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-14 rounded-full bg-bg-elevated text-text-secondary font-bold text-sm active:scale-[0.98] transition-transform"
            >
              Cancelar
            </button>
            <Button
              type="submit"
              variant="primary"
              loading={mutation.isPending}
              className="flex-1 h-14 rounded-full text-sm font-bold"
              disabled={!value || Number(value) <= 0}
            >
              Salvar Teste
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Main Card ── */

export function FitnessTestsCard() {
  const token = useAuthStore((s) => s.token);
  const [activeForm, setActiveForm] = useState<ActiveForm>(null);

  const { data } = useQuery<FitnessTestsData>({
    queryKey: ['fitness-tests'],
    queryFn: async () => {
      const res = await apiFetch<{ data: FitnessTestsData }>('/api/fitness-tests', {
        token: token ?? undefined,
      });
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!token,
  });

  return (
    <>
      <div className="rounded-card bg-bg-surface p-6 border border-hairline shadow-card">
        <div className="flex items-center gap-2 mb-4">
          <span className="material-symbols-outlined text-lg text-text-secondary">science</span>
          <div>
            <h3 className="font-heading text-base font-bold text-text-primary">Testes de Fitness</h3>
            <p className="text-[10px] text-text-muted">T30 / FTP 20min / Cooper 12min</p>
          </div>
        </div>

        <div className="space-y-3">
          <TestResultRow test={data?.swim_t30 ?? null} type="swim_t30" onNew={() => setActiveForm('swim_t30')} />
          <TestResultRow test={data?.bike_ftp20 ?? null} type="bike_ftp20" onNew={() => setActiveForm('bike_ftp20')} />
          <TestResultRow test={data?.run_cooper12 ?? null} type="run_cooper12" onNew={() => setActiveForm('run_cooper12')} />
        </div>
      </div>

      {activeForm && <TestForm type={activeForm} onClose={() => setActiveForm(null)} />}
    </>
  );
}
