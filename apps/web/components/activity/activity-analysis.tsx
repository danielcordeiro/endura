'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { AnalysisResult } from './analysis-types';
import { AnalysisSummary } from './analysis-summary';
import { AnalysisGraph } from './analysis-graph';
import { AnalysisPeaks } from './analysis-peaks';
import { AnalysisZones } from './analysis-zones';
import { AeroCard } from './aero-card';
import { BikeSelector } from './bike-selector';

interface ActivityAnalysisProps {
  activityId: string;
  analysis: AnalysisResult;
  bikeId?: string | null;
}

type Tab = 'summary' | 'graph' | 'peaks' | 'zones';

const TABS: { key: Tab; label: string }[] = [
  { key: 'summary', label: 'Resumo' },
  { key: 'graph', label: 'Gráfico' },
  { key: 'peaks', label: 'Picos' },
  { key: 'zones', label: 'Zonas' },
];

export function ActivityAnalysis({ activityId, analysis, bikeId }: ActivityAnalysisProps) {
  const [tab, setTab] = useState<Tab>('summary');
  const [selectedLap, setSelectedLap] = useState<number | 'full'>('full');

  const metrics = selectedLap === 'full'
    ? analysis.summary
    : analysis.laps.find((l) => l.lapIndex === selectedLap) ?? analysis.summary;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-heading font-semibold text-lg text-text-primary">Análise do Treino</h2>
        <div className="flex gap-1 bg-bg-elevated rounded-full p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-bold transition-all',
                tab === t.key ? 'bg-primary text-white' : 'text-text-secondary hover:text-text-primary',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'summary' && analysis.laps.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
          <button
            onClick={() => setSelectedLap('full')}
            className={cn(
              'shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold border transition-colors',
              selectedLap === 'full'
                ? 'bg-primary/15 border-primary/40 text-primary'
                : 'bg-bg-surface border-border text-text-secondary hover:text-text-primary',
            )}
          >
            <span className="material-symbols-outlined text-[16px]">timeline</span>
            Treino completo
          </button>
          {analysis.laps.map((lap) => (
            <button
              key={lap.lapIndex}
              onClick={() => setSelectedLap(lap.lapIndex)}
              className={cn(
                'shrink-0 px-3.5 py-2 rounded-full text-xs font-bold border transition-colors',
                selectedLap === lap.lapIndex
                  ? 'bg-primary/15 border-primary/40 text-primary'
                  : 'bg-bg-surface border-border text-text-secondary hover:text-text-primary',
              )}
            >
              Lap {lap.lapIndex}
            </button>
          ))}
        </div>
      )}

      {tab === 'summary' && (
        <>
          {/* Bike + CdA são da atividade inteira — só no treino completo, só bike. */}
          {selectedLap === 'full' && analysis.discipline === 'bike' && (
            <BikeSelector activityId={activityId} currentBikeId={bikeId ?? null} />
          )}
          {selectedLap === 'full' && analysis.aero && <AeroCard aero={analysis.aero} />}
          <AnalysisSummary metrics={metrics} discipline={analysis.discipline} weightKg={analysis.inputs.weightKg} />
        </>
      )}
      {tab === 'graph' && <AnalysisGraph activityId={activityId} />}
      {tab === 'peaks' && <AnalysisPeaks peaks={analysis.peaks} weightKg={analysis.inputs.weightKg} />}
      {tab === 'zones' && <AnalysisZones hrZones={analysis.zones.hr} powerZones={analysis.zones.power} />}
    </div>
  );
}
