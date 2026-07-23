// Espelha AnalysisResult / SegmentMetrics de apps/api/src/modules/activity/activity-analytics.ts.
// Mantido local (não em @endura/types) porque é consumido só pela UI de
// análise de atividade — mesmo padrão do resto de apps/web/app/(app)/atividades.

export interface MinAvgMax {
  min: number | null;
  avg: number | null;
  max: number | null;
}

export interface SegmentMetrics {
  durationSec: number;
  movingSec: number;
  distanceM: number | null;
  elevGainM: number | null;
  elevLossM: number | null;
  avgGradePct: number | null;
  power: MinAvgMax;
  heartRate: MinAvgMax;
  cadence: MinAvgMax;
  speedMs: MinAvgMax;
  altitudeM: MinAvgMax;
  tempC: MinAvgMax;
  npWatts: number | null;
  ifValue: number | null;
  viValue: number | null;
  efValue: number | null;
  pwHrDecouplingPct: number | null;
  vamMhr: number | null;
  tss: number | null;
  tssMethod: 'power' | 'hr' | null;
  workKj: number | null;
  wPerKg: number | null;
}

export interface LapAnalysis extends SegmentMetrics {
  lapIndex: number;
  startOffsetSec: number;
  name: string | null;
}

export interface ZoneResult {
  zone: number;
  label: string;
  lowPct: number;
  highPct: number | null;
  secs: number;
  pct: number;
}

export interface PeakEfforts {
  power: Record<string, number | null>;
  pace: Record<string, number | null>;
}

export type Discipline = 'bike' | 'run' | 'swim' | 'other';

export interface AnalysisResult {
  version: 1;
  computedAt: string;
  discipline: Discipline;
  inputs: { ftpWatts: number | null; maxHr: number | null; weightKg: number | null };
  summary: SegmentMetrics;
  peaks: PeakEfforts;
  zones: { hr: ZoneResult[]; power: ZoneResult[] };
  laps: LapAnalysis[];
}

export interface ActivityStreamsResponse {
  sampleCount: number;
  originalSampleCount: number;
  timeSec: number[];
  watts: (number | null)[];
  heartRate: (number | null)[];
  cadence: (number | null)[];
  altitudeM: (number | null)[];
  velocityMs: (number | null)[];
  distanceM: (number | null)[];
  laps: { lapIndex: number; startOffsetSec: number; name: string | null }[];
}
