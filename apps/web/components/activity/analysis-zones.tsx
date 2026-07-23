'use client';

import type { ZoneResult } from './analysis-types';
import { formatClock } from '@/lib/activity-format';

interface AnalysisZonesProps {
  hrZones: ZoneResult[];
  powerZones: ZoneResult[];
}

const ZONE_COLORS = ['#4c9af0', '#2fd583', '#f5a524', '#f0765a', '#f0524e', '#c026d3', '#7c3aed'];

function ZoneBars({ title, zones, thresholdLabel }: { title: string; zones: ZoneResult[]; thresholdLabel: string }) {
  const total = zones.reduce((s, z) => s + z.secs, 0);
  if (total === 0) return null;

  return (
    <div className="rounded-card border border-border bg-bg-surface p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[11px] font-bold uppercase tracking-widest text-text-secondary">{title}</h3>
        <span className="text-[10px] text-text-faint">{thresholdLabel}</span>
      </div>
      <div className="space-y-2.5">
        {zones.map((z, i) => (
          <div key={z.zone} className="flex items-center gap-3">
            <span className="w-6 text-[11px] font-bold text-text-muted text-center shrink-0">Z{z.zone}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-text-secondary truncate">{z.label}</span>
                <span className="text-[11px] font-mono text-text-muted shrink-0 ml-2">
                  {formatClock(z.secs)} · {z.pct.toFixed(0)}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-bg-elevated overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${Math.max(z.pct, z.pct > 0 ? 1.5 : 0)}%`, backgroundColor: ZONE_COLORS[i % ZONE_COLORS.length] }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AnalysisZones({ hrZones, powerZones }: AnalysisZonesProps) {
  if (hrZones.length === 0 && powerZones.length === 0) {
    return (
      <div className="flex flex-col items-center py-10 space-y-3">
        <span className="material-symbols-outlined text-[32px] text-text-faint">donut_large</span>
        <p className="font-body text-sm text-text-muted text-center">
          Cadastre FTP/FC máx no perfil para calcular zonas.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {powerZones.length > 0 && <ZoneBars title="Zonas de potência" zones={powerZones} thresholdLabel="% FTP" />}
      {hrZones.length > 0 && <ZoneBars title="Zonas de frequência cardíaca" zones={hrZones} thresholdLabel="% FC máx" />}
    </div>
  );
}
