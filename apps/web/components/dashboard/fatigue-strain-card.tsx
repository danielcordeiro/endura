'use client';

import { cn } from '@/lib/utils';

interface FatigueStrainCardProps {
  weeklyTSS: number;
  monotony: number;
  strain: number;
  currentATL: number;
  currentCTL: number;
}

export function FatigueStrainCard({ weeklyTSS, monotony, strain, currentATL, currentCTL }: FatigueStrainCardProps) {
  // Fatigue ratio (ATL/CTL) — >1.3 is danger zone
  const fatigueRatio = currentCTL > 0 ? currentATL / currentCTL : 0;
  const fatiguePercent = Math.min(100, Math.round(fatigueRatio * 70));

  const fatigueLevel = fatigueRatio > 1.3 ? 'high' : fatigueRatio > 1.0 ? 'moderate' : 'low';
  const fatigueConfig = {
    high: { label: 'Alta', color: 'text-rose-400', bar: 'bg-rose-500', icon: 'warning' },
    moderate: { label: 'Moderada', color: 'text-amber-400', bar: 'bg-amber-500', icon: 'info' },
    low: { label: 'Baixa', color: 'text-emerald-400', bar: 'bg-emerald-500', icon: 'check_circle' },
  }[fatigueLevel];

  // Monotony risk
  const monotonyRisk = monotony > 2.0 ? 'high' : monotony > 1.5 ? 'moderate' : 'low';

  return (
    <div className="rounded-card bg-bg-surface p-6 ring-1 ring-hairline shadow-card">
      <div className="flex items-center gap-2 mb-4">
        <span className="material-symbols-outlined text-lg text-slate-400">monitor_heart</span>
        <h3 className="font-heading text-base font-bold text-slate-100">Fadiga & Carga</h3>
      </div>

      {/* Fatigue gauge */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <span className={cn('material-symbols-outlined text-base', fatigueConfig.color)}>
              {fatigueConfig.icon}
            </span>
            <span className="text-xs text-slate-400">Fadiga acumulada</span>
          </div>
          <span className={cn('text-xs font-bold', fatigueConfig.color)}>
            {fatigueConfig.label}
          </span>
        </div>
        <div className="relative h-3 bg-slate-800 rounded-full overflow-hidden">
          {/* Zone markers */}
          <div className="absolute inset-0 flex">
            <div className="flex-[70] bg-emerald-500/10 border-r border-slate-700" />
            <div className="flex-[30] bg-amber-500/10 border-r border-slate-700" />
            <div className="flex-[30] bg-rose-500/10" />
          </div>
          <div
            className={cn('absolute top-0 left-0 h-full rounded-full transition-all duration-700', fatigueConfig.bar)}
            style={{ width: `${fatiguePercent}%`, opacity: 0.85 }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[9px] text-emerald-500/60">Fresco</span>
          <span className="text-[9px] text-amber-500/60">Moderado</span>
          <span className="text-[9px] text-rose-500/60">Sobrecarregado</span>
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-bg-elevated rounded-2xl p-3.5 text-center">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">TSS/Sem</p>
          <p className="font-mono text-lg font-bold text-white">{weeklyTSS}</p>
        </div>
        <div className="bg-bg-elevated rounded-2xl p-3 text-center">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Monotonia</p>
          <p className={cn(
            'font-mono text-lg font-bold',
            monotonyRisk === 'high' ? 'text-rose-400' : monotonyRisk === 'moderate' ? 'text-amber-400' : 'text-white',
          )}>
            {monotony.toFixed(1)}
          </p>
        </div>
        <div className="bg-bg-elevated rounded-2xl p-3 text-center">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Strain</p>
          <p className="font-mono text-lg font-bold text-white">{strain.toFixed(0)}</p>
        </div>
      </div>

      {/* Risk alert */}
      {(monotonyRisk === 'high' || fatigueLevel === 'high') && (
        <div className="mt-3 flex items-start gap-2 bg-rose-500/10 border border-rose-500/20 rounded-xl p-3">
          <span className="material-symbols-outlined text-base text-rose-400 mt-0.5">warning</span>
          <p className="text-xs text-rose-300 leading-relaxed">
            {fatigueLevel === 'high' && 'Fadiga muito alta. Considere um dia de recuperacao.'}
            {fatigueLevel !== 'high' && monotonyRisk === 'high' && 'Monotonia alta — varie a intensidade dos treinos para reduzir risco de lesao.'}
          </p>
        </div>
      )}
    </div>
  );
}
