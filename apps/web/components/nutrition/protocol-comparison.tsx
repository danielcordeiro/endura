'use client';

import { cn } from '@/lib/utils';

/* ── Types ── */

interface ComparisonData {
  prescribed: {
    totalCarbsG: number;
    totalSodiumMg: number;
    totalCaffeineMg: number;
    totalKcal: number;
  } | null;
  actual: {
    totalCarbsG: number;
    totalSodiumMg: number;
    totalCaffeineMg: number;
    totalKcal: number;
    followedExactly: boolean;
  } | null;
  metrics: {
    carbsPerHour: number;
    sodiumPerHour: number;
    prescribedCarbsPerHour: number;
  };
  status: {
    carbs: 'green' | 'yellow' | 'red';
    sodium: 'green' | 'yellow' | 'red';
    caffeine: 'green' | 'yellow' | 'red';
    kcal: 'green' | 'yellow' | 'red';
  } | null;
}

interface ProtocolComparisonProps {
  data: ComparisonData;
  className?: string;
}

const statusColors = {
  green: { bg: 'bg-success/15', text: 'text-success', label: 'Na meta' },
  yellow: { bg: 'bg-warning/15', text: 'text-warning', label: 'Parcial' },
  red: { bg: 'bg-danger/15', text: 'text-danger', label: 'Sub-fueling' },
};

const statusIcons = {
  green: 'check_circle',
  yellow: 'warning',
  red: 'error',
};

/* ── Component ── */

export function ProtocolComparison({ data, className }: ProtocolComparisonProps) {
  if (!data.prescribed && !data.actual) {
    return null;
  }

  const nutrients = [
    { key: 'carbs' as const, label: 'Carboidratos', unit: 'g', prescribed: data.prescribed?.totalCarbsG ?? 0, actual: data.actual?.totalCarbsG ?? 0 },
    { key: 'sodium' as const, label: 'Sodio', unit: 'mg', prescribed: data.prescribed?.totalSodiumMg ?? 0, actual: data.actual?.totalSodiumMg ?? 0 },
    { key: 'caffeine' as const, label: 'Cafeina', unit: 'mg', prescribed: data.prescribed?.totalCaffeineMg ?? 0, actual: data.actual?.totalCaffeineMg ?? 0 },
    { key: 'kcal' as const, label: 'Calorias', unit: 'kcal', prescribed: data.prescribed?.totalKcal ?? 0, actual: data.actual?.totalKcal ?? 0 },
  ];

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-heading font-bold text-base text-text-primary">
          Prescrito vs Consumido
        </h3>
        {data.actual?.followedExactly && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-success/15 text-[11px] font-bold text-success">
            <span className="material-symbols-outlined text-[12px]">check</span>
            Seguido exatamente
          </span>
        )}
      </div>

      {/* Comparison bars */}
      <div className="space-y-3">
        {nutrients.map((nutrient) => {
          const status = data.status?.[nutrient.key];
          const maxVal = Math.max(nutrient.prescribed, nutrient.actual, 1);
          const prescribedPct = (nutrient.prescribed / maxVal) * 100;
          const actualPct = (nutrient.actual / maxVal) * 100;

          return (
            <div key={nutrient.key} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-secondary">{nutrient.label}</span>
                {status && (
                  <span className={cn(
                    'inline-flex items-center gap-1 text-[10px] font-bold',
                    statusColors[status].text,
                  )}>
                    <span className="material-symbols-outlined text-[12px]">{statusIcons[status]}</span>
                    {statusColors[status].label}
                  </span>
                )}
              </div>
              <div className="space-y-2">
                {/* Prescribed bar */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-text-muted w-12">Prescrito</span>
                  <div className="flex-1 h-2 bg-bg-elevated rounded-full overflow-hidden">
                    <div
                      className="h-full bg-info/50 rounded-full transition-all"
                      style={{ width: `${prescribedPct}%` }}
                    />
                  </div>
                  <span className="font-[var(--font-mono)] text-[11px] text-text-secondary w-16 text-right">
                    {Math.round(nutrient.prescribed)}{nutrient.unit}
                  </span>
                </div>
                {/* Actual bar */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-text-muted w-12">Real</span>
                  <div className="flex-1 h-2 bg-bg-elevated rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        status === 'green' ? 'bg-success' : status === 'yellow' ? 'bg-warning' : 'bg-danger',
                      )}
                      style={{ width: `${actualPct}%` }}
                    />
                  </div>
                  <span className="font-[var(--font-mono)] text-[11px] text-text-secondary w-16 text-right">
                    {Math.round(nutrient.actual)}{nutrient.unit}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Metrics */}
      <div className="flex gap-2">
        <div className="flex-1 text-center py-3 rounded-xl bg-bg-elevated border border-border">
          <p className="font-[var(--font-mono)] font-bold text-lg text-white leading-none">
            {data.metrics.carbsPerHour}
          </p>
          <p className="text-[9px] font-bold uppercase tracking-widest text-text-muted mt-1">g/h CARB</p>
        </div>
        <div className="flex-1 text-center py-3 rounded-xl bg-bg-elevated border border-border">
          <p className="font-[var(--font-mono)] font-bold text-lg text-white leading-none">
            {data.metrics.sodiumPerHour}
          </p>
          <p className="text-[9px] font-bold uppercase tracking-widest text-text-muted mt-1">mg/h SODIO</p>
        </div>
        {data.metrics.prescribedCarbsPerHour > 0 && (
          <div className="flex-1 text-center py-3 rounded-xl bg-info/10 border border-info/20">
            <p className="font-[var(--font-mono)] font-bold text-lg text-info leading-none">
              {data.metrics.prescribedCarbsPerHour}
            </p>
            <p className="text-[9px] font-bold uppercase tracking-widest text-info/60 mt-1">g/h META</p>
          </div>
        )}
      </div>
    </div>
  );
}
