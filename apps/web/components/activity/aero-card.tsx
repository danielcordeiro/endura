'use client';

import type { AeroResult, AeroConfidenceTier } from './analysis-types';

interface AeroCardProps {
  aero: AeroResult;
}

const TIER_META: Record<AeroConfidenceTier, { label: string; color: string; dim: string }> = {
  high: { label: 'Alta confiança', color: 'text-success', dim: 'bg-success-dim' },
  medium: { label: 'Média confiança', color: 'text-warning', dim: 'bg-warning-dim' },
  low: { label: 'Baixa confiança', color: 'text-danger', dim: 'bg-danger-dim' },
};

const DOT: Record<AeroConfidenceTier, string> = {
  high: 'bg-success',
  medium: 'bg-warning',
  low: 'bg-danger',
};

export function AeroCard({ aero }: AeroCardProps) {
  const tier = TIER_META[aero.confidence.tier];

  return (
    <div className="rounded-card border border-border bg-bg-surface p-4 space-y-3">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-bike">air</span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">
            Aerodinâmica · CdA estimado
          </span>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${tier.dim} ${tier.color}`}>
          <span className={`h-2 w-2 rounded-full ${DOT[aero.confidence.tier]}`} />
          {tier.label}
        </span>
      </div>

      {/* Valor principal + tradução tangível */}
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="font-[var(--font-mono)] font-bold text-3xl text-white leading-none">
            {aero.cdaM2.toFixed(3)}
            <span className="text-base text-text-muted font-normal ml-1">m²</span>
          </div>
          <div className="text-[13px] text-text-secondary mt-1.5">
            ≈ <span className="font-semibold text-text-primary">{aero.wattsAt40kmh} W</span> de arrasto a 40 km/h
          </div>
        </div>
      </div>

      {/* Fatores limitantes / avisos */}
      {aero.confidence.reasons.length > 0 && (
        <ul className="space-y-1 border-t border-border/60 pt-2.5">
          {aero.confidence.reasons.map((r) => (
            <li key={r} className="flex items-start gap-1.5 text-[12px] text-text-muted">
              <span className="material-symbols-outlined text-[14px] leading-[18px] text-text-faint">info</span>
              {r}
            </li>
          ))}
        </ul>
      )}

      {/* Setup usado (transparência) */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-text-faint border-t border-border/60 pt-2.5">
        <span>massa {aero.systemMassKg} kg</span>
        <span>Crr {aero.crr}</span>
        <span>ρ {aero.airDensityKgM3} kg/m³</span>
        <span>{Math.round(aero.sampleSecs / 60)} min úteis</span>
      </div>
    </div>
  );
}
