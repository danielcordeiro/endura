'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { apiFetch, cn } from '@/lib/utils';

interface WellnessData {
  hrv: number | null;
  restingHr: number | null;
  sleepDurationH: number | null;
  sleepScore: number | null;
  spo2: number | null;
  stressLevel: number | null;
  bodyBattery: number | null;
  date: string | null;
}

function formatSleepDuration(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${h}h`;
}

function getHrvColor(hrv: number): string {
  if (hrv >= 60) return 'text-emerald-400';
  if (hrv >= 40) return 'text-blue-400';
  if (hrv >= 25) return 'text-amber-400';
  return 'text-rose-400';
}

function getSleepColor(score: number): string {
  if (score >= 80) return 'text-emerald-400';
  if (score >= 60) return 'text-blue-400';
  if (score >= 40) return 'text-amber-400';
  return 'text-rose-400';
}

function getStressColor(level: number): string {
  if (level <= 25) return 'text-emerald-400';
  if (level <= 50) return 'text-blue-400';
  if (level <= 75) return 'text-amber-400';
  return 'text-rose-400';
}

function getBatteryColor(battery: number): string {
  if (battery >= 70) return 'text-emerald-400';
  if (battery >= 40) return 'text-blue-400';
  if (battery >= 20) return 'text-amber-400';
  return 'text-rose-400';
}

function getSpO2Color(spo2: number): string {
  if (spo2 >= 95) return 'text-emerald-400';
  if (spo2 >= 90) return 'text-amber-400';
  return 'text-rose-400';
}

function CircularGauge({ value, max, color, size = 56 }: { value: number; max: number; color: string; size?: number }) {
  const radius = (size - 6) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(value / max, 1);
  const offset = circumference * (1 - pct);

  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#1e293b" strokeWidth={5} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={5}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="transition-all duration-700 ease-out"
      />
    </svg>
  );
}

function MetricTile({
  icon,
  label,
  value,
  unit,
  subtext,
  colorClass,
  gaugeValue,
  gaugeMax,
  gaugeColor,
}: {
  icon: string;
  label: string;
  value: string;
  unit?: string;
  subtext?: string;
  colorClass: string;
  gaugeValue?: number;
  gaugeMax?: number;
  gaugeColor?: string;
}) {
  return (
    <div className="bg-bg-elevated rounded-2xl p-3.5 flex flex-col items-center text-center relative overflow-hidden">
      {gaugeValue != null && gaugeMax && gaugeColor && (
        <div className="relative mb-1">
          <CircularGauge value={gaugeValue} max={gaugeMax} color={gaugeColor} />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={cn('material-symbols-outlined text-lg', colorClass)}>{icon}</span>
          </div>
        </div>
      )}
      {gaugeValue == null && (
        <span className={cn('material-symbols-outlined text-xl mb-1.5', colorClass)}>{icon}</span>
      )}
      <p className={cn('font-mono text-lg font-bold leading-tight', colorClass)}>
        {value}
        {unit && <span className="text-[10px] text-slate-500 font-normal ml-0.5">{unit}</span>}
      </p>
      <p className="text-[10px] text-slate-500 mt-0.5">{label}</p>
      {subtext && <p className="text-[9px] text-slate-600 mt-0.5">{subtext}</p>}
    </div>
  );
}

export function WellnessCard() {
  const token = useAuthStore((s) => s.token);

  const { data, isLoading } = useQuery<WellnessData | null>({
    queryKey: ['wellness-data'],
    queryFn: async () => {
      const res = await apiFetch<{ data: WellnessData | null }>('/api/integrations/intervals/wellness', {
        token: token ?? undefined,
      });
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!token,
  });

  if (isLoading) {
    return (
      <div className="rounded-[2rem] bg-bg-surface p-5 ring-1 ring-white/5 shadow-xl">
        <div className="skeleton h-4 w-32 rounded mb-4" />
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton h-24 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null; // No wellness data, don't show card

  const hasAnyData = data.hrv || data.sleepDurationH || data.bodyBattery || data.stressLevel || data.spo2 || data.restingHr;
  if (!hasAnyData) return null;

  return (
    <div className="rounded-[2rem] bg-bg-surface p-6 ring-1 ring-white/5 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <span className="material-symbols-outlined text-lg text-slate-400">watch</span>
          <div>
            <h3 className="font-heading text-base font-bold text-slate-100">Dados do Relogio</h3>
            <p className="text-[10px] text-slate-500">
              {data.date ? new Date(data.date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : ''}
              {' '}via Garmin
            </p>
          </div>
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-3">
        {data.hrv != null && (
          <MetricTile
            icon="favorite"
            label="HRV"
            value={data.hrv.toFixed(0)}
            unit="ms"
            colorClass={getHrvColor(data.hrv)}
            gaugeValue={data.hrv}
            gaugeMax={100}
            gaugeColor={data.hrv >= 60 ? '#22c55e' : data.hrv >= 40 ? '#3b82f6' : data.hrv >= 25 ? '#f59e0b' : '#ef4444'}
          />
        )}

        {data.sleepDurationH != null && (
          <MetricTile
            icon="bedtime"
            label="Sono"
            value={formatSleepDuration(data.sleepDurationH)}
            subtext={data.sleepScore != null ? `Score: ${data.sleepScore}` : undefined}
            colorClass={data.sleepScore != null ? getSleepColor(data.sleepScore) : 'text-blue-400'}
            gaugeValue={data.sleepDurationH}
            gaugeMax={9}
            gaugeColor={data.sleepDurationH >= 7 ? '#22c55e' : data.sleepDurationH >= 6 ? '#3b82f6' : '#f59e0b'}
          />
        )}

        {data.bodyBattery != null && (
          <MetricTile
            icon="battery_charging_full"
            label="Body Battery"
            value={String(data.bodyBattery)}
            unit="%"
            colorClass={getBatteryColor(data.bodyBattery)}
            gaugeValue={data.bodyBattery}
            gaugeMax={100}
            gaugeColor={data.bodyBattery >= 70 ? '#22c55e' : data.bodyBattery >= 40 ? '#3b82f6' : data.bodyBattery >= 20 ? '#f59e0b' : '#ef4444'}
          />
        )}

        {data.stressLevel != null && (
          <MetricTile
            icon="psychology"
            label="Stress"
            value={String(data.stressLevel)}
            subtext={data.stressLevel <= 25 ? 'Baixo' : data.stressLevel <= 50 ? 'Medio' : data.stressLevel <= 75 ? 'Alto' : 'Muito alto'}
            colorClass={getStressColor(data.stressLevel)}
          />
        )}

        {data.restingHr != null && (
          <MetricTile
            icon="ecg_heart"
            label="FC Repouso"
            value={String(data.restingHr)}
            unit="bpm"
            colorClass="text-rose-400"
          />
        )}

        {data.spo2 != null && (
          <MetricTile
            icon="spo2"
            label="SpO2"
            value={String(data.spo2)}
            unit="%"
            colorClass={getSpO2Color(data.spo2)}
            gaugeValue={data.spo2}
            gaugeMax={100}
            gaugeColor={data.spo2 >= 95 ? '#22c55e' : data.spo2 >= 90 ? '#f59e0b' : '#ef4444'}
          />
        )}
      </div>
    </div>
  );
}
