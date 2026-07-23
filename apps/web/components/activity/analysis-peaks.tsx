'use client';

import type { PeakEfforts } from './analysis-types';
import { formatPeakDurationLabel, bestEffortToPaceLabel, labelForTargetDistance, fmtNum, POWER_PEAK_DURATIONS_SEC } from '@/lib/activity-format';

interface AnalysisPeaksProps {
  peaks: PeakEfforts;
  weightKg: number | null;
}

export function AnalysisPeaks({ peaks, weightKg }: AnalysisPeaksProps) {
  const powerRows = POWER_PEAK_DURATIONS_SEC
    .map((d) => ({ d, w: peaks.power[String(d)] }))
    .filter((r) => r.w != null);

  const paceEntries = Object.entries(peaks.pace).filter(([, v]) => v != null);

  if (powerRows.length === 0 && paceEntries.length === 0) {
    return (
      <div className="flex flex-col items-center py-10 space-y-3">
        <span className="material-symbols-outlined text-[32px] text-text-faint">show_chart</span>
        <p className="font-body text-sm text-text-muted text-center">Sem dados suficientes para curva de picos.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {powerRows.length > 0 && (
        <div className="rounded-card border border-border bg-bg-surface p-4">
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-text-secondary mb-3">Curva de potência (melhor média por duração)</h3>
          <div className="grid grid-cols-[1fr_auto_auto] gap-y-2.5 items-center">
            <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Duração</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted text-right w-16">Potência</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted text-right w-16">{weightKg ? 'W/kg' : ''}</span>
            {powerRows.map(({ d, w }) => (
              <div key={d} className="contents">
                <span className="text-[13px] text-text-secondary py-1.5 border-t border-border/50">{formatPeakDurationLabel(d)}</span>
                <span className="font-[var(--font-mono)] text-[14px] font-bold text-text-primary text-right w-16 py-1.5 border-t border-border/50">{fmtNum(w)} W</span>
                <span className="font-[var(--font-mono)] text-[13px] text-text-muted text-right w-16 py-1.5 border-t border-border/50">{weightKg && w != null ? fmtNum(w / weightKg, 2) : ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {paceEntries.length > 0 && (
        <div className="rounded-card border border-border bg-bg-surface p-4">
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-text-secondary mb-3">Melhores esforços (pace)</h3>
          <div className="grid grid-cols-[1fr_auto] gap-y-2.5 items-center">
            {paceEntries.map(([distStr, sec]) => {
              const dist = Number(distStr);
              return (
                <div key={distStr} className="contents">
                  <span className="text-[13px] text-text-secondary py-1.5 border-t border-border/50">{labelForTargetDistance(dist)}</span>
                  <span className="font-[var(--font-mono)] text-[14px] font-bold text-text-primary text-right py-1.5 border-t border-border/50">{bestEffortToPaceLabel(sec, dist)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
