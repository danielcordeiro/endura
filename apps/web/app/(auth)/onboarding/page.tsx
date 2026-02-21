'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { apiFetch, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

/* ═══════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════ */

type Level = 'BEGINNER' | 'INTERMEDIATE' | 'COMPETITIVE';
type Discipline = 'SWIM' | 'BIKE' | 'RUN';
type RaceDistance = 'SPRINT' | 'OLYMPIC' | 'HALF' | 'FULL';
type RaceGoalType = 'FINISH' | 'TIME';
type NutritionProduct = 'Gel' | 'Isotonico' | 'Barra' | 'Capsula de sal' | 'Cafeina';

interface OnboardingData {
  // Step 1 - Perfil Atletico
  level: Level | null;
  weakestDiscipline: Discipline | null;
  availableDays: number[];
  weeklyHours: number;

  // Step 2 - Prova Alvo
  raceDistance: RaceDistance | null;
  raceDate: string;
  raceGoalType: RaceGoalType;
  targetTime: string;
  raceName: string;

  // Step 3 - Dados Fisiologicos
  weight: string;
  height: string;
  maxHr: string;
  ftp: string;
  pace5k: string;
  hasPool: boolean;
  hasBikeTrainer: boolean;
  hasTreadmill: boolean;

  // Step 4 - Nutricao
  dietaryRestrictions: string;
  ownedProducts: NutritionProduct[];
  giSensitivity: boolean;
  highSweatRate: boolean;
  crampsHistory: boolean;

  // Step 5 - Integracoes
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
      // 1) POST athlete profile
      await apiFetch('/api/athlete/profile', {
        method: 'POST',
        token: token ?? undefined,
        body: JSON.stringify({
          level: data.level,
          weakestDiscipline: data.weakestDiscipline,
          availableDays: data.availableDays,
          weeklyHours: data.weeklyHours,
          weight: data.weight ? parseFloat(data.weight) : null,
          height: data.height ? parseFloat(data.height) : null,
          maxHr: data.maxHr ? parseInt(data.maxHr, 10) : null,
          ftp: data.ftp ? parseInt(data.ftp, 10) : null,
          pace5k: data.pace5k || null,
          hasPool: data.hasPool,
          hasBikeTrainer: data.hasBikeTrainer,
          hasTreadmill: data.hasTreadmill,
          dietaryRestrictions: data.dietaryRestrictions || null,
          ownedProducts: data.ownedProducts,
          giSensitivity: data.giSensitivity,
          highSweatRate: data.highSweatRate,
          crampsHistory: data.crampsHistory,
        }),
      });

      // 2) POST race goal
      await apiFetch('/api/athlete/race-goal', {
        method: 'POST',
        token: token ?? undefined,
        body: JSON.stringify({
          distance: data.raceDistance,
          raceDate: data.raceDate || null,
          goalType: data.raceGoalType,
          targetTime: data.raceGoalType === 'TIME' ? data.targetTime : null,
          raceName: data.raceName || null,
        }),
      });

      // 3) POST generate plan
      await apiFetch('/api/plan/generate', {
        method: 'POST',
        token: token ?? undefined,
      });

      router.push('/dashboard');
    } catch (err) {
      console.error('Onboarding submit error:', err);
      setIsSubmitting(false);
    }
  }

  const inputClass =
    'w-full h-12 px-4 bg-bg-input border border-border rounded-md text-text-primary placeholder:text-text-muted font-body text-[15px] outline-none transition-colors focus:border-border-focus';

  /* ─── Loading overlay ─── */
  if (isSubmitting) {
    return (
      <div className="w-full max-w-[440px] flex flex-col items-center justify-center gap-6 py-20 animate-fade-in">
        <svg
          className="animate-spin h-10 w-10 text-primary"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
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
        <h1 className="font-heading font-bold text-[36px] leading-none text-primary tracking-tight">
          ENDURA
        </h1>
      </div>

      {/* Progress dots */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <div
            key={i}
            className={cn(
              'w-2.5 h-2.5 rounded-full transition-all',
              i + 1 <= step ? 'bg-primary' : 'bg-border',
            )}
          />
        ))}
      </div>

      {/* Steps */}
      {step === 1 && (
        <Step1 data={data} update={update} inputClass={inputClass} />
      )}
      {step === 2 && (
        <Step2 data={data} update={update} inputClass={inputClass} />
      )}
      {step === 3 && (
        <Step3 data={data} update={update} inputClass={inputClass} />
      )}
      {step === 4 && (
        <Step4 data={data} update={update} inputClass={inputClass} />
      )}
      {step === 5 && (
        <Step5 data={data} update={update} />
      )}

      {/* Navigation */}
      <div className="mt-8 flex items-center gap-3">
        {step > 1 && (
          <button
            type="button"
            onClick={back}
            className="flex items-center justify-center w-12 h-12 rounded-md border border-border text-text-secondary hover:bg-bg-surface transition-colors"
            aria-label="Voltar"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}

        {step < TOTAL_STEPS && (
          <Button type="button" fullWidth onClick={next}>
            Continuar
          </Button>
        )}

        {step === TOTAL_STEPS && (
          <Button type="button" fullWidth onClick={handleSubmit}>
            Gerar meu plano
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
  inputClass?: string;
}

/* ═══════════════════════════════════════════════════════
   Step 1 — Perfil Atletico
   ═══════════════════════════════════════════════════════ */

const LEVELS: { value: Level; label: string; desc: string }[] = [
  { value: 'BEGINNER', label: 'Iniciante', desc: 'Primeiras provas ou ate 1 ano' },
  { value: 'INTERMEDIATE', label: 'Intermediario', desc: '1-3 anos de experiencia' },
  { value: 'COMPETITIVE', label: 'Competitivo', desc: 'Focado em resultado e tempo' },
];

const DISCIPLINES: { value: Discipline; label: string; color: string }[] = [
  { value: 'SWIM', label: 'SWIM', color: 'bg-swim' },
  { value: 'BIKE', label: 'BIKE', color: 'bg-bike' },
  { value: 'RUN', label: 'RUN', color: 'bg-run' },
];

const DAY_LABELS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

function Step1({ data, update, inputClass }: StepProps) {
  function toggleDay(dayIndex: number) {
    const days = data.availableDays.includes(dayIndex)
      ? data.availableDays.filter((d) => d !== dayIndex)
      : [...data.availableDays, dayIndex];
    update({ availableDays: days });
  }

  return (
    <div className="space-y-6">
      <h2 className="font-heading font-bold text-xl text-text-primary uppercase tracking-wide">
        Perfil Atletico
      </h2>

      {/* Level */}
      <div className="space-y-2">
        <label className="text-text-secondary text-sm font-medium">Nivel</label>
        <div className="space-y-2">
          {LEVELS.map((lvl) => (
            <button
              key={lvl.value}
              type="button"
              onClick={() => update({ level: lvl.value })}
              className={cn(
                'w-full text-left p-4 rounded-md border transition-all',
                'bg-bg-surface',
                data.level === lvl.value
                  ? 'border-primary bg-primary-dim'
                  : 'border-border hover:border-border-focus',
              )}
            >
              <span className="block text-text-primary font-semibold text-[15px]">
                {lvl.label}
              </span>
              <span className="block text-text-muted text-[13px] mt-0.5">
                {lvl.desc}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Weakest discipline */}
      <div className="space-y-2">
        <label className="text-text-secondary text-sm font-medium">
          Disciplina mais fraca
        </label>
        <div className="flex gap-2">
          {DISCIPLINES.map((d) => (
            <button
              key={d.value}
              type="button"
              onClick={() => update({ weakestDiscipline: d.value })}
              className={cn(
                'flex-1 h-10 rounded-md text-sm font-bold uppercase tracking-wider transition-all border',
                data.weakestDiscipline === d.value
                  ? `${d.color} text-white border-transparent`
                  : 'bg-bg-surface border-border text-text-secondary hover:border-border-focus',
              )}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* Available days */}
      <div className="space-y-2">
        <label className="text-text-secondary text-sm font-medium">
          Dias disponiveis
        </label>
        <div className="flex gap-2">
          {DAY_LABELS.map((label, i) => (
            <button
              key={i}
              type="button"
              onClick={() => toggleDay(i)}
              className={cn(
                'w-10 h-10 rounded-full text-sm font-semibold transition-all',
                data.availableDays.includes(i)
                  ? 'bg-primary text-text-inverse'
                  : 'bg-bg-surface border border-border text-text-muted hover:border-border-focus',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Weekly hours */}
      <div className="space-y-2">
        <label className="text-text-secondary text-sm font-medium">
          Horas semanais: <span className="text-primary font-bold">{data.weeklyHours}h</span>
        </label>
        <input
          type="range"
          min={3}
          max={25}
          value={data.weeklyHours}
          onChange={(e) => update({ weeklyHours: parseInt(e.target.value, 10) })}
          className="w-full h-2 rounded-full appearance-none bg-border accent-primary cursor-pointer"
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

const RACE_DISTANCES: { value: RaceDistance; label: string; detail: string }[] = [
  { value: 'SPRINT', label: 'Sprint', detail: '750m / 20km / 5km' },
  { value: 'OLYMPIC', label: 'Olimpico', detail: '1.5km / 40km / 10km' },
  { value: 'HALF', label: '70.3', detail: '1.9km / 90km / 21.1km' },
  { value: 'FULL', label: 'Full', detail: '3.8km / 180km / 42.2km' },
];

function Step2({ data, update, inputClass }: StepProps) {
  return (
    <div className="space-y-6">
      <h2 className="font-heading font-bold text-xl text-text-primary uppercase tracking-wide">
        Prova Alvo
      </h2>

      {/* Distance grid */}
      <div className="space-y-2">
        <label className="text-text-secondary text-sm font-medium">Distancia</label>
        <div className="grid grid-cols-2 gap-2">
          {RACE_DISTANCES.map((rd) => (
            <button
              key={rd.value}
              type="button"
              onClick={() => update({ raceDistance: rd.value })}
              className={cn(
                'p-4 rounded-md border text-left transition-all bg-bg-surface',
                data.raceDistance === rd.value
                  ? 'border-primary bg-primary-dim'
                  : 'border-border hover:border-border-focus',
              )}
            >
              <span className="block text-text-primary font-bold text-[15px]">
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
      <div className="space-y-2">
        <label className="text-text-secondary text-sm font-medium">Data da prova</label>
        <input
          type="date"
          value={data.raceDate}
          onChange={(e) => update({ raceDate: e.target.value })}
          className={inputClass}
        />
      </div>

      {/* Goal type */}
      <div className="space-y-2">
        <label className="text-text-secondary text-sm font-medium">Objetivo</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => update({ raceGoalType: 'FINISH' })}
            className={cn(
              'flex-1 h-12 rounded-md text-sm font-semibold uppercase tracking-wider transition-all border',
              data.raceGoalType === 'FINISH'
                ? 'border-primary bg-primary-dim text-primary'
                : 'bg-bg-surface border-border text-text-secondary hover:border-border-focus',
            )}
          >
            Terminar
          </button>
          <button
            type="button"
            onClick={() => update({ raceGoalType: 'TIME' })}
            className={cn(
              'flex-1 h-12 rounded-md text-sm font-semibold uppercase tracking-wider transition-all border',
              data.raceGoalType === 'TIME'
                ? 'border-primary bg-primary-dim text-primary'
                : 'bg-bg-surface border-border text-text-secondary hover:border-border-focus',
            )}
          >
            Bater tempo
          </button>
        </div>
      </div>

      {/* Target time (conditional) */}
      {data.raceGoalType === 'TIME' && (
        <div className="space-y-2">
          <label className="text-text-secondary text-sm font-medium">Tempo alvo</label>
          <input
            type="text"
            placeholder="Ex: 5:30:00"
            value={data.targetTime}
            onChange={(e) => update({ targetTime: e.target.value })}
            className={inputClass}
          />
        </div>
      )}

      {/* Race name (optional) */}
      <div className="space-y-2">
        <label className="text-text-secondary text-sm font-medium">
          Nome da prova <span className="text-text-muted">(opcional)</span>
        </label>
        <input
          type="text"
          placeholder="Ex: Ironman 70.3 Florianopolis"
          value={data.raceName}
          onChange={(e) => update({ raceName: e.target.value })}
          className={inputClass}
        />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Step 3 — Dados Fisiologicos
   ═══════════════════════════════════════════════════════ */

function Step3({ data, update, inputClass }: StepProps) {
  return (
    <div className="space-y-6">
      <h2 className="font-heading font-bold text-xl text-text-primary uppercase tracking-wide">
        Dados Fisiologicos
      </h2>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-text-secondary text-sm font-medium">Peso (kg)</label>
          <input
            type="number"
            step="0.1"
            placeholder="72.5"
            value={data.weight}
            onChange={(e) => update({ weight: e.target.value })}
            className={inputClass}
          />
        </div>
        <div className="space-y-1">
          <label className="text-text-secondary text-sm font-medium">Altura (cm)</label>
          <input
            type="number"
            placeholder="175"
            value={data.height}
            onChange={(e) => update({ height: e.target.value })}
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-text-secondary text-sm font-medium">FC max (bpm)</label>
          <input
            type="number"
            placeholder="185"
            value={data.maxHr}
            onChange={(e) => update({ maxHr: e.target.value })}
            className={inputClass}
          />
        </div>
        <div className="space-y-1">
          <label className="text-text-secondary text-sm font-medium">
            FTP (W) <span className="text-text-muted text-[11px]">opc.</span>
          </label>
          <input
            type="number"
            placeholder="220"
            value={data.ftp}
            onChange={(e) => update({ ftp: e.target.value })}
            className={inputClass}
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-text-secondary text-sm font-medium">Pace 5K (min:seg)</label>
        <input
          type="text"
          placeholder="5:30"
          value={data.pace5k}
          onChange={(e) => update({ pace5k: e.target.value })}
          className={inputClass}
        />
      </div>

      {/* Equipment */}
      <div className="space-y-3">
        <label className="text-text-secondary text-sm font-medium">Equipamentos</label>
        <ToggleCheckbox
          checked={data.hasPool}
          onChange={(v) => update({ hasPool: v })}
          label="Acesso a piscina"
        />
        <ToggleCheckbox
          checked={data.hasBikeTrainer}
          onChange={(v) => update({ hasBikeTrainer: v })}
          label="Rolo / bike trainer"
        />
        <ToggleCheckbox
          checked={data.hasTreadmill}
          onChange={(v) => update({ hasTreadmill: v })}
          label="Esteira"
        />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Step 4 — Nutricao
   ═══════════════════════════════════════════════════════ */

const NUTRITION_PRODUCTS: NutritionProduct[] = [
  'Gel',
  'Isotonico',
  'Barra',
  'Capsula de sal',
  'Cafeina',
];

function Step4({ data, update, inputClass }: StepProps) {
  function toggleProduct(product: NutritionProduct) {
    const products = data.ownedProducts.includes(product)
      ? data.ownedProducts.filter((p) => p !== product)
      : [...data.ownedProducts, product];
    update({ ownedProducts: products });
  }

  return (
    <div className="space-y-6">
      <h2 className="font-heading font-bold text-xl text-text-primary uppercase tracking-wide">
        Nutricao
      </h2>

      {/* Dietary restrictions */}
      <div className="space-y-2">
        <label className="text-text-secondary text-sm font-medium">
          Restricoes alimentares
        </label>
        <input
          type="text"
          placeholder="Ex: vegetariano, lactose, gluten..."
          value={data.dietaryRestrictions}
          onChange={(e) => update({ dietaryRestrictions: e.target.value })}
          className={inputClass}
        />
      </div>

      {/* Owned products */}
      <div className="space-y-2">
        <label className="text-text-secondary text-sm font-medium">
          Produtos que ja possui
        </label>
        <div className="flex flex-wrap gap-2">
          {NUTRITION_PRODUCTS.map((product) => (
            <button
              key={product}
              type="button"
              onClick={() => toggleProduct(product)}
              className={cn(
                'px-4 h-9 rounded-full text-[13px] font-medium transition-all border',
                data.ownedProducts.includes(product)
                  ? 'bg-primary text-text-inverse border-transparent'
                  : 'bg-bg-surface border-border text-text-secondary hover:border-border-focus',
              )}
            >
              {product}
            </button>
          ))}
        </div>
      </div>

      {/* Boolean toggles */}
      <div className="space-y-3">
        <label className="text-text-secondary text-sm font-medium">Historico</label>
        <ToggleCheckbox
          checked={data.giSensitivity}
          onChange={(v) => update({ giSensitivity: v })}
          label="Sensibilidade gastrointestinal"
        />
        <ToggleCheckbox
          checked={data.highSweatRate}
          onChange={(v) => update({ highSweatRate: v })}
          label="Alta taxa de sudorese"
        />
        <ToggleCheckbox
          checked={data.crampsHistory}
          onChange={(v) => update({ crampsHistory: v })}
          label="Historico de caibras"
        />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Step 5 — Integracoes
   ═══════════════════════════════════════════════════════ */

function Step5({ data, update }: Omit<StepProps, 'inputClass'>) {
  function handleConnectStrava() {
    window.location.href = `${API_URL}/api/integrations/strava/authorize`;
  }

  function handleConnectIntervals() {
    window.location.href = `${API_URL}/api/integrations/intervals/authorize`;
  }

  return (
    <div className="space-y-6">
      <h2 className="font-heading font-bold text-xl text-text-primary uppercase tracking-wide">
        Integracoes
      </h2>
      <p className="text-text-secondary text-sm">
        Conecte suas contas para sincronizar treinos automaticamente.
      </p>

      {/* Strava */}
      <div
        className={cn(
          'p-4 rounded-md border transition-all bg-bg-surface',
          data.stravaConnected ? 'border-success' : 'border-border',
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-strava flex items-center justify-center">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
              </svg>
            </div>
            <div>
              <p className="text-text-primary font-semibold text-[15px]">Strava</p>
              <p className="text-text-muted text-[12px]">Sincronize treinos e atividades</p>
            </div>
          </div>
          {data.stravaConnected ? (
            <div className="flex items-center gap-1.5 text-success text-[13px] font-medium">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Conectado
            </div>
          ) : (
            <Button variant="strava" onClick={handleConnectStrava} className="h-9 px-4 text-[13px]">
              Conectar
            </Button>
          )}
        </div>
      </div>

      {/* intervals.icu */}
      <div
        className={cn(
          'p-4 rounded-md border transition-all bg-bg-surface',
          data.intervalsConnected ? 'border-success' : 'border-border',
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-info flex items-center justify-center">
              <span className="text-white font-mono font-bold text-[14px]">i.cu</span>
            </div>
            <div>
              <p className="text-text-primary font-semibold text-[15px]">intervals.icu</p>
              <p className="text-text-muted text-[12px]">Metricas avancadas de treino</p>
            </div>
          </div>
          {data.intervalsConnected ? (
            <div className="flex items-center gap-1.5 text-success text-[13px] font-medium">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Conectado
            </div>
          ) : (
            <Button variant="secondary" onClick={handleConnectIntervals} className="h-9 px-4 text-[13px]">
              Conectar
            </Button>
          )}
        </div>
      </div>

      {/* Skip link */}
      <div className="text-center">
        <button
          type="button"
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
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-3 w-full text-left group"
    >
      <div
        className={cn(
          'w-5 h-5 rounded flex items-center justify-center border transition-all flex-shrink-0',
          checked
            ? 'bg-primary border-primary'
            : 'bg-bg-input border-border group-hover:border-border-focus',
        )}
      >
        {checked && (
          <svg className="w-3 h-3 text-text-inverse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      <span className="text-text-primary text-[14px]">{label}</span>
    </button>
  );
}
