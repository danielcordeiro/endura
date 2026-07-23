'use client';

import { Fragment } from 'react';
import type { SegmentMetrics, Discipline } from './analysis-types';
import { formatClock, fmtNum, fmtSigned, msToKmh } from '@/lib/activity-format';

interface AnalysisSummaryProps {
  metrics: SegmentMetrics;
  discipline: Discipline;
  weightKg: number | null;
}

function StatBlock({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-card border border-border bg-bg-surface p-4">
      <span className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">{label}</span>
      <div className="font-[var(--font-mono)] font-bold text-xl text-white leading-none">
        {value}
        {unit && <span className="text-sm text-text-muted font-normal ml-0.5">{unit}</span>}
      </div>
    </div>
  );
}

function KeyValueRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 px-1 border-b border-border/60 last:border-b-0">
      <span className="text-[13px] text-text-secondary">{label}</span>
      <span className="font-[var(--font-mono)] font-semibold text-[15px] text-text-primary">{value}</span>
    </div>
  );
}

export function AnalysisSummary({ metrics, discipline, weightKg }: AnalysisSummaryProps) {
  const hasPower = metrics.power.avg != null && metrics.power.avg > 0;
  const distanceKm = metrics.distanceM != null ? (metrics.distanceM / 1000).toFixed(2) : null;

  const leftRows: { label: string; value: string }[] = [];
  const rightRows: { label: string; value: string }[] = [];

  if (hasPower) {
    leftRows.push({ label: 'Trabalho', value: metrics.workKj != null ? `${fmtNum(metrics.workKj)} kJ` : '--' });
    leftRows.push({ label: 'NP', value: metrics.npWatts != null ? `${metrics.npWatts} W` : '--' });
    leftRows.push({ label: 'Pw:Hr (decoupling)', value: metrics.pwHrDecouplingPct != null ? `${fmtSigned(metrics.pwHrDecouplingPct, 1)}%` : '--' });

    rightRows.push({ label: 'IF', value: metrics.ifValue != null ? fmtNum(metrics.ifValue, 2) : '--' });
    rightRows.push({ label: 'VI', value: metrics.viValue != null ? fmtNum(metrics.viValue, 2) : '--' });
    rightRows.push({ label: 'EF', value: metrics.efValue != null ? fmtNum(metrics.efValue, 2) : '--' });
  } else if (metrics.heartRate.avg != null) {
    // Sem potência: decoupling ainda existe (calculado com pace/velocidade).
    leftRows.push({ label: 'Decoupling (Pace:FC)', value: metrics.pwHrDecouplingPct != null ? `${fmtSigned(metrics.pwHrDecouplingPct, 1)}%` : '--' });
  }

  leftRows.push({ label: 'Ganho de elevação', value: metrics.elevGainM != null ? `${fmtNum(metrics.elevGainM)} m` : '--' });
  leftRows.push({ label: 'Perda de elevação', value: metrics.elevLossM != null ? `${fmtNum(metrics.elevLossM)} m` : '--' });
  rightRows.push({ label: 'Grade média', value: metrics.avgGradePct != null ? `${fmtSigned(metrics.avgGradePct, 1)}%` : '--' });
  rightRows.push({ label: 'VAM', value: metrics.vamMhr != null ? `${fmtNum(metrics.vamMhr)} m/h` : '--' });

  if (hasPower && weightKg) {
    leftRows.push({ label: 'W/kg', value: fmtNum(metrics.power.avg! / weightKg, 2) });
  }

  const minAvgMaxRows: { label: string; unit: string; row: SegmentMetrics['power'] }[] = [
    { label: 'Potência', unit: 'W', row: metrics.power },
    { label: 'Freq. Cardíaca', unit: 'bpm', row: metrics.heartRate },
    { label: 'Cadência', unit: discipline === 'run' ? 'ppm' : 'rpm', row: metrics.cadence },
    { label: 'Velocidade', unit: 'km/h', row: {
      min: msToKmh(metrics.speedMs.min), avg: msToKmh(metrics.speedMs.avg), max: msToKmh(metrics.speedMs.max),
    } },
    { label: 'Elevação', unit: 'm', row: metrics.altitudeM },
    { label: 'Temperatura', unit: '°C', row: metrics.tempC },
  ].filter((r) => r.row.avg != null);

  return (
    <div className="space-y-5">
      {/* Hero: Duração / Distância / TSS */}
      <div className="grid grid-cols-3 gap-3">
        <StatBlock label="Duração" value={formatClock(metrics.durationSec)} />
        <StatBlock label="Distância" value={distanceKm ?? '--'} unit={distanceKm ? 'km' : undefined} />
        <StatBlock label="TSS" value={metrics.tss != null ? fmtNum(metrics.tss, 0) : '--'} />
      </div>

      {/* Grid de métricas avançadas — 2 colunas, mesmo layout do TP */}
      <div className="grid grid-cols-2 gap-x-4 rounded-card border border-border bg-bg-surface px-4">
        <div>{leftRows.map((r) => <KeyValueRow key={r.label} {...r} />)}</div>
        <div>{rightRows.map((r) => <KeyValueRow key={r.label} {...r} />)}</div>
      </div>

      {/* Min / Avg / Max */}
      {minAvgMaxRows.length > 0 && (
        <div className="rounded-card border border-border bg-bg-surface p-4">
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 gap-y-2.5 items-center">
            <span />
            <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted text-right w-14">Min</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted text-right w-14">Média</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted text-right w-14">Máx</span>
            {minAvgMaxRows.map(({ label, unit, row }) => (
              <Fragment key={label}>
                <span className="text-[13px] text-text-secondary">{label} <span className="text-text-faint">({unit})</span></span>
                <span className="font-[var(--font-mono)] text-[13px] text-text-primary text-right w-14">{fmtNum(row.min, unit === 'km/h' ? 1 : 0)}</span>
                <span className="font-[var(--font-mono)] text-[13px] font-bold text-text-primary text-right w-14">{fmtNum(row.avg, unit === 'km/h' ? 1 : 0)}</span>
                <span className="font-[var(--font-mono)] text-[13px] text-text-primary text-right w-14">{fmtNum(row.max, unit === 'km/h' ? 1 : 0)}</span>
              </Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
