'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { apiFetch, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/field';

/* ═══════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════ */

type Level = 'BEGINNER' | 'INTERMEDIATE' | 'COMPETITIVE';
type Discipline = 'SWIM' | 'BIKE' | 'RUN';
type RaceDistance = 'SPRINT' | 'OLYMPIC' | 'HALF' | 'FULL';
type RaceGoalType = 'FINISH' | 'TIME';
type NutritionProduct = 'Gel' | 'Isotonico' | 'Barra' | 'Capsula de sal' | 'Cafeina';

interface OnboardingData {
  level: Level | null;
  weakestDiscipline: Discipline | null;
  availableDays: number[];
  weeklyHours: number;
  raceDistance: RaceDistance | null;
  raceDate: string;
  raceGoalType: RaceGoalType;
  targetTime: string;
  raceName: string;
  weight: string;
  height: string;
  maxHr: string;
  ftp: string;
  pace5k: string;
  hasPool: boolean;
  hasBikeTrainer: boolean;
  hasTreadmill: boolean;
  dietaryRestrictions: string;
  ownedProducts: NutritionProduct[];
  giSensitivity: boolean;
  highSweatRate: boolean;
  crampsHistory: boolean;
  stravaConnected: boolean;
  intervalsConnected: boolean;
}

const TOTAL_STEPS = 5;

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

/* ═══════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════ */

export default function OnboardingPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [data, setData] = useState<OnboardingData>({
    level: null,
    weakestDiscipline: null,
    availableDays: [],
    weeklyHours: 8,
    raceDistance: null,
    raceDate: '',
    raceGoalType: 'FINISH',
    targetTime: '',
    raceName: '',
    weight: '',
    height: '',
    maxHr: '',
    ftp: '',
    pace5k: '',
    hasPool: false,
    hasBikeTrainer: false,
    hasTreadmill: false,
    dietaryRestrictions: '',
    ownedProducts: [],
    giSensitivity: false,
    highSweatRate: false,
    crampsHistory: false,
    stravaConnected: false,
    intervalsConnected: false,
  });

  function update(partial: Partial<OnboardingData>) {
    setData((prev) => ({ ...prev, ...partial }));
  }

  function next() {
    if (step < TOTAL_STEPS) setStep(step + 1);
  }

  function back() {
    if (step > 1) setStep(step - 1);
  }

  async function handleSubmit() {
    setIsSubmitting(true);
    try {
      const levelMap: Record<string, string> = {
        BEGINNER: 'iniciante',
        INTERMEDIATE: 'intermediario',
        COMPETITIVE: 'competitivo',
      };
      const distanceMap: Record<string, string> = {
        SPRINT: 'sprint',
        OLYMPIC: 'olympic',
        HALF: '70.3',
        FULL: 'full',
      };

      function paceToSeconds(pace: string): number | null {
        if (!pace) return null;
        const parts = pace.split(':');
        if (parts.length !== 2) return null;
        const mins = parseInt(parts[0], 10);
        const secs = parseInt(parts[1], 10);
        if (isNaN(mins) || isNaN(secs)) return null;
        return mins * 60 + secs;
      }

      function timeToSeconds(time: string): number | null {
        if (!time) return null;
        const parts = time.split(':');
        if (parts.length === 3) {
          return parseInt(parts[0], 10) * 3600 + parseInt(parts[1], 10) * 60 + parseInt(parts[2], 10);
        }
        if (parts.length === 2) {
          return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
        }
        return null;
      }

      await apiFetch('/api/athlete/profile', {
        method: 'POST',
        token: token ?? undefined,
        body: JSON.stringify({
          level: data.level ? levelMap[data.level] ?? data.level.toLowerCase() : 'iniciante',
          weakestDiscipline: data.weakestDiscipline?.toLowerCase() ?? null,
          availableDays: data.availableDays,
          weeklyHours: data.weeklyHours,
          weightKg: data.weight ? parseFloat(data.weight) : null,
          heightCm: data.height ? parseInt(data.height, 10) : null,
          maxHr: data.maxHr ? parseInt(data.maxHr, 10) : null,
          ftpWatts: data.ftp ? parseInt(data.ftp, 10) : null,
          run5kPaceSec: paceToSeconds(data.pace5k),
          hasPool: data.hasPool,
          hasBikeTrainer: data.hasBikeTrainer,
          hasTreadmill: data.hasTreadmill,
          dietaryRestrictions: data.dietaryRestrictions
            ? data.dietaryRestrictions.split(',').map((s) => s.trim()).filter(Boolean)
            : null,
          ownedProducts: data.ownedProducts,
          giSensitivity: data.giSensitivity,
          sweatRateHigh: data.highSweatRate,
          crampsHistory: data.crampsHistory,
        }),
      });

      if (data.raceDistance && data.raceDate) {
        await apiFetch('/api/athlete/race-goal', {
          method: 'POST',
          token: token ?? undefined,
          body: JSON.stringify({
            distance: distanceMap[data.raceDistance] ?? data.raceDistance.toLowerCase(),
            raceDate: data.raceDate,
            goal: data.raceGoalType.toLowerCase(),
            targetTime: data.raceGoalType === 'TIME' ? timeToSeconds(data.targetTime) : null,
            raceName: data.raceName || null,
          }),
        });
      }

      try {
        await apiFetch('/api/plan/generate', {
          method: 'POST',
          token: token ?? undefined,
        });
      } catch {
        // IA pode não estar configurada — segue em frente
      }

      router.push('/dashboard');
    } catch (err) {
      console.error('Onboarding submit error:', err);
      setIsSubmitting(false);
    }
  }

  /* ─── Loading overlay ─── */
  if (isSubmitting) {
    return (
      <div className="w-full max-w-[440px] flex flex-col items-center justify-center gap-6 py-20 animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
          <span className="material-symbols-outlined text-primary text-3xl animate-spin">progress_activity</span>
        </div>
        <p className="text-text-secondary text-base text-center">
          Gerando seu plano personalizado...
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[440px] animate-fade-in-up">
      {/* Logo */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-2">
          <span className="material-symbols-outlined text-primary text-3xl">bolt</span>
          <h1 className="font-bold text-[32px] leading-none text-white tracking-tight">
            ENDURA
          </h1>
        </div>
      </div>

      {/* Progress dots */}
      <div className="flex items-center justify-center gap-2.5 mb-8">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <div
            key={i}
            className={cn(
              'rounded-full transition-all',
              i + 1 <= step
                ? 'w-3 h-3 bg-primary shadow-lg shadow-primary/30'
                : 'w-2.5 h-2.5 bg-bg-elevated',
            )}
          />
        ))}
      </div>

      {/* Steps */}
      {step === 1 && <Step1 data={data} update={update} />}
      {step === 2 && <Step2 data={data} update={update} />}
      {step === 3 && <Step3 data={data} update={update} />}
      {step === 4 && <Step4 data={data} update={update} />}
      {step === 5 && <Step5 data={data} update={update} onSkip={handleSubmit} />}

      {/* Navigation */}
      <div className="mt-8 flex items-center gap-3">
        {step > 1 && (
          <button
            type="button"
            onClick={back}
            className="flex items-center justify-center w-14 h-14 rounded-full border border-border-strong/50 text-text-secondary hover:bg-bg-surface transition-colors"
            aria-label="Voltar"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
        )}

        {step < TOTAL_STEPS && (
          <Button type="button" fullWidth onClick={next}>
            Continuar
            <span className="material-symbols-outlined text-xl ml-1">arrow_forward</span>
          </Button>
        )}

        {step === TOTAL_STEPS && (
          <Button type="button" fullWidth onClick={handleSubmit}>
            Gerar meu plano
            <span className="material-symbols-outlined text-xl ml-1">auto_awesome</span>
          </Button>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Step Props
   ═══════════════════════════════════════════════════════ */

interface StepProps {
  data: OnboardingData;
  update: (partial: Partial<OnboardingData>) => void;
}

/* ═══════════════════════════════════════════════════════
   Step 1 — Perfil Atlético
   ═══════════════════════════════════════════════════════ */

const LEVELS: { value: Level; label: string; desc: string; emoji: string }[] = [
  { value: 'BEGINNER', label: 'Iniciante', desc: 'Primeiras provas ou até 1 ano', emoji: '🌱' },
  { value: 'INTERMEDIATE', label: 'Intermediário', desc: '1-3 anos de experiência', emoji: '🔥' },
  { value: 'COMPETITIVE', label: 'Competitivo', desc: 'Focado em resultado e tempo', emoji: '🏆' },
];

const DISCIPLINES: { value: Discipline; label: string; icon: string; color: string }[] = [
  { value: 'SWIM', label: 'SWIM', icon: 'pool', color: 'bg-swim' },
  { value: 'BIKE', label: 'BIKE', icon: 'directions_bike', color: 'bg-bike' },
  { value: 'RUN', label: 'RUN', icon: 'directions_run', color: 'bg-run' },
];

const DAY_LABELS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

function Step1({ data, update }: StepProps) {
  function toggleDay(dayIndex: number) {
    const days = data.availableDays.includes(dayIndex)
      ? data.availableDays.filter((d) => d !== dayIndex)
      : [...data.availableDays, dayIndex];
    update({ availableDays: days });
  }

  return (
    <div className="space-y-6">
      <h2 className="font-bold text-2xl text-white tracking-tight">
        Perfil Atlético
      </h2>

      {/* Level — radio cards with emoji */}
      <div className="space-y-2">
        <label className="text-text-secondary text-sm font-medium">Nível</label>
        <div className="space-y-2">
          {LEVELS.map((lvl) => (
            <button
              key={lvl.value}
              type="button"
              onClick={() => update({ level: lvl.value })}
              className={cn(
                'w-full text-left p-4 rounded-2xl border transition-all flex items-center gap-4',
                'bg-bg-surface',
                data.level === lvl.value
                  ? 'border-primary shadow-lg shadow-primary/10 ring-1 ring-primary/30'
                  : 'border-border-strong/50 hover:border-text-faint',
              )}
            >
              <span className="text-2xl">{lvl.emoji}</span>
              <div>
                <span className="block text-white font-semibold text-[15px]">
                  {lvl.label}
                </span>
                <span className="block text-text-muted text-[13px] mt-0.5">
                  {lvl.desc}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Weakest discipline — segmented pill */}
      <div className="space-y-2">
        <label className="text-text-secondary text-sm font-medium">
          Disciplina mais fraca
        </label>
        <div className="flex gap-2 bg-bg-surface border border-border-strong/50 p-1.5 rounded-full">
          {DISCIPLINES.map((d) => (
            <button
              key={d.value}
              type="button"
              onClick={() => update({ weakestDiscipline: d.value })}
              className={cn(
                'flex-1 h-11 rounded-full text-sm font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5',
                data.weakestDiscipline === d.value
                  ? `${d.color} text-white shadow-md`
                  : 'text-text-secondary hover:text-white',
              )}
            >
              <span className="material-symbols-outlined text-lg">{d.icon}</span>
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* Available days — circles */}
      <div className="space-y-2">
        <label className="text-text-secondary text-sm font-medium">
          Dias disponíveis
        </label>
        <div className="flex gap-2 justify-between">
          {DAY_LABELS.map((label, i) => (
            <button
              key={i}
              type="button"
              onClick={() => toggleDay(i)}
              className={cn(
                'w-11 h-11 rounded-full text-sm font-semibold transition-all',
                data.availableDays.includes(i)
                  ? 'bg-primary text-white shadow-lg shadow-primary/25'
                  : 'bg-bg-surface border border-border-strong/50 text-text-muted hover:border-text-faint',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Weekly hours — range slider */}
      <div className="space-y-3">
        <label className="text-text-secondary text-sm font-medium">
          Horas semanais: <span className="text-primary font-bold">{data.weeklyHours}h</span>
        </label>
        <input
          type="range"
          min={3}
          max={25}
          value={data.weeklyHours}
          onChange={(e) => update({ weeklyHours: parseInt(e.target.value, 10) })}
          className="w-full h-2 rounded-full appearance-none bg-bg-elevated accent-primary cursor-pointer"
        />
        <div className="flex justify-between text-[12px] text-text-muted">
          <span>3h</span>
          <span>25h</span>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Step 2 — Prova Alvo
   ═══════════════════════════════════════════════════════ */

const RACE_DISTANCES: { value: RaceDistance; label: string; detail: string; emoji: string }[] = [
  { value: 'SPRINT', label: 'Sprint', detail: '750m / 20km / 5km', emoji: '⚡' },
  { value: 'OLYMPIC', label: 'Olímpico', detail: '1.5km / 40km / 10km', emoji: '🏅' },
  { value: 'HALF', label: '70.3', detail: '1.9km / 90km / 21.1km', emoji: '💪' },
  { value: 'FULL', label: 'Full', detail: '3.8km / 180km / 42.2km', emoji: '🦾' },
];

function Step2({ data, update }: StepProps) {
  return (
    <div className="space-y-6">
      <h2 className="font-bold text-2xl text-white tracking-tight">
        Prova Alvo
      </h2>

      {/* Distance grid — emoji cards */}
      <div className="space-y-2">
        <label className="text-text-secondary text-sm font-medium">Distância</label>
        <div className="grid grid-cols-2 gap-2">
          {RACE_DISTANCES.map((rd) => (
            <button
              key={rd.value}
              type="button"
              onClick={() => update({ raceDistance: rd.value })}
              className={cn(
                'p-4 rounded-2xl border text-left transition-all bg-bg-surface',
                data.raceDistance === rd.value
                  ? 'border-primary shadow-lg shadow-primary/10 ring-1 ring-primary/30'
                  : 'border-border-strong/50 hover:border-text-faint',
              )}
            >
              <span className="text-xl mb-2 block">{rd.emoji}</span>
              <span className="block text-white font-bold text-[15px]">
                {rd.label}
              </span>
              <span className="block text-text-muted text-[12px] mt-1">
                {rd.detail}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Race date */}
      <Field label="Data da prova">
        <Input
          size="lg"
          type="date"
          value={data.raceDate}
          onChange={(e) => update({ raceDate: e.target.value })}
        />
      </Field>

      {/* Goal type — segmented pill */}
      <div className="space-y-2">
        <label className="text-text-secondary text-sm font-medium">Objetivo</label>
        <div className="flex gap-1 bg-bg-surface border border-border-strong/50 p-1.5 rounded-full">
          <button
            type="button"
            onClick={() => update({ raceGoalType: 'FINISH' })}
            className={cn(
              'flex-1 h-11 rounded-full text-sm font-semibold transition-all',
              data.raceGoalType === 'FINISH'
                ? 'bg-primary text-white shadow-md'
                : 'text-text-secondary hover:text-white',
            )}
          >
            Terminar
          </button>
          <button
            type="button"
            onClick={() => update({ raceGoalType: 'TIME' })}
            className={cn(
              'flex-1 h-11 rounded-full text-sm font-semibold transition-all',
              data.raceGoalType === 'TIME'
                ? 'bg-primary text-white shadow-md'
                : 'text-text-secondary hover:text-white',
            )}
          >
            Bater tempo
          </button>
        </div>
      </div>

      {/* Target time (conditional) */}
      {data.raceGoalType === 'TIME' && (
        <Field label="Tempo alvo">
          <Input
            size="lg"
            type="text"
            placeholder="Ex: 5:30:00"
            value={data.targetTime}
            onChange={(e) => update({ targetTime: e.target.value })}
          />
        </Field>
      )}

      {/* Race name (optional) */}
      <Field label={<>Nome da prova <span className="text-text-muted font-normal">(opcional)</span></>}>
        <Input
          size="lg"
          type="text"
          placeholder="Ex: Ironman 70.3 Florianópolis"
          value={data.raceName}
          onChange={(e) => update({ raceName: e.target.value })}
        />
      </Field>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Step 3 — Dados Fisiológicos
   ═══════════════════════════════════════════════════════ */

function Step3({ data, update }: StepProps) {
  return (
    <div className="space-y-6">
      <h2 className="font-bold text-2xl text-white tracking-tight">
        Dados Fisiológicos
      </h2>

      <div className="grid grid-cols-2 gap-x-3 gap-y-4">
        <Field label="Peso (kg)">
          <Input
            size="lg"
            type="number"
            step="0.1"
            placeholder="72.5"
            value={data.weight}
            onChange={(e) => update({ weight: e.target.value })}
          />
        </Field>
        <Field label="Altura (cm)">
          <Input
            size="lg"
            type="number"
            placeholder="175"
            value={data.height}
            onChange={(e) => update({ height: e.target.value })}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-4">
        <Field label="FC máx (bpm)">
          <Input
            size="lg"
            type="number"
            placeholder="185"
            value={data.maxHr}
            onChange={(e) => update({ maxHr: e.target.value })}
          />
        </Field>
        <Field label={<>FTP (W) <span className="text-text-muted font-normal">opc.</span></>}>
          <Input
            size="lg"
            type="number"
            placeholder="220"
            value={data.ftp}
            onChange={(e) => update({ ftp: e.target.value })}
          />
        </Field>
      </div>

      <Field label="Pace 5K (min:seg)">
        <Input
          size="lg"
          type="text"
          placeholder="5:30"
          value={data.pace5k}
          onChange={(e) => update({ pace5k: e.target.value })}
        />
      </Field>

      {/* Equipment */}
      <div className="space-y-3">
        <label className="text-text-secondary text-sm font-medium">Equipamentos</label>
        <ToggleCheckbox
          checked={data.hasPool}
          onChange={(v) => update({ hasPool: v })}
          label="Acesso a piscina"
          icon="pool"
        />
        <ToggleCheckbox
          checked={data.hasBikeTrainer}
          onChange={(v) => update({ hasBikeTrainer: v })}
          label="Rolo / bike trainer"
          icon="two_wheeler"
        />
        <ToggleCheckbox
          checked={data.hasTreadmill}
          onChange={(v) => update({ hasTreadmill: v })}
          label="Esteira"
          icon="directions_run"
        />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Step 4 — Nutrição
   ═══════════════════════════════════════════════════════ */

const NUTRITION_PRODUCTS: NutritionProduct[] = [
  'Gel',
  'Isotonico',
  'Barra',
  'Capsula de sal',
  'Cafeina',
];

function Step4({ data, update }: StepProps) {
  function toggleProduct(product: NutritionProduct) {
    const products = data.ownedProducts.includes(product)
      ? data.ownedProducts.filter((p) => p !== product)
      : [...data.ownedProducts, product];
    update({ ownedProducts: products });
  }

  return (
    <div className="space-y-6">
      <h2 className="font-bold text-2xl text-white tracking-tight">
        Nutrição
      </h2>

      {/* Dietary restrictions */}
      <Field label="Restrições alimentares">
        <Input
          size="lg"
          type="text"
          placeholder="Ex: vegetariano, lactose, glúten..."
          value={data.dietaryRestrictions}
          onChange={(e) => update({ dietaryRestrictions: e.target.value })}
        />
      </Field>

      {/* Owned products — pill buttons */}
      <div className="space-y-2">
        <label className="text-text-secondary text-sm font-medium">
          Produtos que já possui
        </label>
        <div className="flex flex-wrap gap-2">
          {NUTRITION_PRODUCTS.map((product) => (
            <button
              key={product}
              type="button"
              onClick={() => toggleProduct(product)}
              className={cn(
                'px-5 h-10 rounded-full text-[13px] font-medium transition-all border',
                data.ownedProducts.includes(product)
                  ? 'bg-primary text-white border-transparent shadow-lg shadow-primary/20'
                  : 'bg-bg-surface border-border-strong/50 text-text-secondary hover:border-text-faint',
              )}
            >
              {product}
            </button>
          ))}
        </div>
      </div>

      {/* Boolean toggles */}
      <div className="space-y-3">
        <label className="text-text-secondary text-sm font-medium">Histórico</label>
        <ToggleCheckbox
          checked={data.giSensitivity}
          onChange={(v) => update({ giSensitivity: v })}
          label="Sensibilidade gastrointestinal"
          icon="gastroenterology"
        />
        <ToggleCheckbox
          checked={data.highSweatRate}
          onChange={(v) => update({ highSweatRate: v })}
          label="Alta taxa de sudorese"
          icon="water_drop"
        />
        <ToggleCheckbox
          checked={data.crampsHistory}
          onChange={(v) => update({ crampsHistory: v })}
          label="Histórico de câibras"
          icon="flash_on"
        />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Step 5 — Integrações
   ═══════════════════════════════════════════════════════ */

function Step5({ data, update, onSkip }: Omit<StepProps, 'inputClass'> & { onSkip: () => void }) {
  function handleConnectStrava() {
    window.location.href = `${API_URL}/api/integrations/strava/connect`;
  }

  function handleConnectIntervals() {
    window.location.href = `${API_URL}/api/integrations/intervals/connect`;
  }

  return (
    <div className="space-y-6">
      <h2 className="font-bold text-2xl text-white tracking-tight">
        Integrações
      </h2>
      <p className="text-text-secondary text-sm">
        Conecte suas contas para sincronizar treinos automaticamente.
      </p>

      {/* Strava */}
      <div
        className={cn(
          'p-5 rounded-2xl border transition-all bg-bg-surface',
          data.stravaConnected ? 'border-success/50' : 'border-border-strong/50',
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-strava flex items-center justify-center">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
              </svg>
            </div>
            <div>
              <p className="text-white font-semibold text-[15px]">Strava</p>
              <p className="text-text-muted text-[12px]">Sincronize treinos e atividades</p>
            </div>
          </div>
          {data.stravaConnected ? (
            <div className="flex items-center gap-1.5 text-success text-[13px] font-medium">
              <span className="material-symbols-outlined text-base">check_circle</span>
              Conectado
            </div>
          ) : (
            <Button variant="strava" size="sm" onClick={handleConnectStrava}>
              Conectar
            </Button>
          )}
        </div>
      </div>

      {/* intervals.icu */}
      <div
        className={cn(
          'p-5 rounded-2xl border transition-all bg-bg-surface',
          data.intervalsConnected ? 'border-success/50' : 'border-border-strong/50',
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-blue-600 flex items-center justify-center">
              <span className="text-white font-[var(--font-mono)] font-bold text-[14px]">i.cu</span>
            </div>
            <div>
              <p className="text-white font-semibold text-[15px]">intervals.icu</p>
              <p className="text-text-muted text-[12px]">Métricas avançadas de treino</p>
            </div>
          </div>
          {data.intervalsConnected ? (
            <div className="flex items-center gap-1.5 text-success text-[13px] font-medium">
              <span className="material-symbols-outlined text-base">check_circle</span>
              Conectado
            </div>
          ) : (
            <Button variant="secondary" size="sm" onClick={handleConnectIntervals}>
              Conectar
            </Button>
          )}
        </div>
      </div>

      {/* Skip link */}
      <div className="text-center">
        <button
          type="button"
          onClick={onSkip}
          className="text-text-muted text-sm hover:text-text-secondary transition-colors underline underline-offset-4"
        >
          Pular por enquanto
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Shared: ToggleCheckbox
   ═══════════════════════════════════════════════════════ */

function ToggleCheckbox({
  checked,
  onChange,
  label,
  icon,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  icon?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        'flex items-center gap-3 w-full text-left p-3.5 rounded-2xl border transition-all',
        checked
          ? 'bg-primary/10 border-primary/30'
          : 'bg-bg-surface border-border-strong/50 hover:border-text-faint',
      )}
    >
      <div
        className={cn(
          'w-6 h-6 rounded-lg flex items-center justify-center border transition-all flex-shrink-0',
          checked
            ? 'bg-primary border-primary'
            : 'bg-bg-elevated border-text-faint',
        )}
      >
        {checked && (
          <span className="material-symbols-outlined text-white text-base">check</span>
        )}
      </div>
      {icon && (
        <span className={cn('material-symbols-outlined text-lg', checked ? 'text-primary' : 'text-text-muted')}>
          {icon}
        </span>
      )}
      <span className={cn('text-[14px]', checked ? 'text-white' : 'text-text-secondary')}>{label}</span>
    </button>
  );
}
