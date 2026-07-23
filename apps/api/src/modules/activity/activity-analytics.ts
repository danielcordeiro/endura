// ── Motor de análise avançada de atividades ──────────────────────
//
// Calcula, a partir das streams brutas (Strava: amostragem "smart
// recording" — intervalo irregular, valor mantido constante entre pontos)
// as métricas de treino no padrão TrainingPeaks/intervals.icu: NP, IF, TSS,
// VI, EF, decoupling (Pw:Hr), VAM, curva de potência (picos), zonas de FC/
// potência e melhores esforços de pace — no nível da atividade inteira E
// por lap.
//
// Referência dos formulas (TrainingPeaks / Coggan "Training and Racing with
// a Power Meter"): NP = média móvel de 30s de potência^4, elevada a 1/4;
// IF = NP/FTP; TSS = (duração_s × NP × IF)/(FTP×3600)×100; VI = NP/avgPower;
// EF = NP/avgHR; decoupling = variação % da razão potência:FC (ou pace:FC)
// entre a 1ª e a 2ª metade do trecho.

export interface StreamData {
  timeSec: number[];
  watts?: number[] | null;
  heartRate?: number[] | null;
  cadence?: number[] | null;
  distanceM?: number[] | null;
  altitudeM?: number[] | null;
  velocityMs?: number[] | null;
  gradePct?: number[] | null;
  moving?: boolean[] | null;
  tempC?: number[] | null;
}

// Deliberadamente em SEGUNDOS decorridos (não em índice de amostra bruta do
// Strava) — a conversão start_index/end_index → segundo acontece na camada
// de ingestão (strava-sync.service.ts, mais perto de onde os índices brutos
// e seus quirks de limites existem). Isso deixa esse módulo puro/testável
// sem precisar da stream de tempo bruta pra reconstruir laps (importante pro
// recompute a partir de activity_streams já salvo, sem rebuscar do Strava).
export interface LapInput {
  lapIndex: number;
  startOffsetSec: number;
  endOffsetSec: number;
  name?: string | null;
}

export interface AthleteContext {
  ftpWatts?: number | null;
  maxHr?: number | null;
  weightKg?: number | null;
}

export type Discipline = 'bike' | 'run' | 'swim' | 'other';

interface MinAvgMax {
  min: number | null;
  avg: number | null;
  max: number | null;
}

export interface ZoneResult {
  zone: number;
  label: string;
  lowPct: number;
  highPct: number | null;
  secs: number;
  pct: number;
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

export interface PeakEfforts {
  power: Record<string, number | null>;
  pace: Record<string, number | null>;
}

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

// ── Constantes ────────────────────────────────────────────────

/** Janela padrão de picos de potência, em segundos. */
const POWER_PEAK_DURATIONS_SEC = [5, 10, 15, 30, 60, 120, 300, 600, 900, 1200, 1800, 2400, 3600, 5400];

/** Distâncias-padrão de melhor esforço por disciplina, em metros. */
const PACE_TARGET_DISTANCES_M: Record<Discipline, number[]> = {
  run: [400, 1000, 1609, 5000, 10000],
  swim: [100, 200, 400, 1000, 1500],
  bike: [],
  other: [],
};

const HR_ZONES = [
  { zone: 1, label: 'Recuperação', lowPct: 0, highPct: 60 },
  { zone: 2, label: 'Aeróbico leve', lowPct: 60, highPct: 70 },
  { zone: 3, label: 'Aeróbico', lowPct: 70, highPct: 80 },
  { zone: 4, label: 'Limiar', lowPct: 80, highPct: 90 },
  { zone: 5, label: 'VO2max/Anaeróbico', lowPct: 90, highPct: null },
];

const POWER_ZONES = [
  { zone: 1, label: 'Recuperação ativa', lowPct: 0, highPct: 55 },
  { zone: 2, label: 'Endurance', lowPct: 55, highPct: 75 },
  { zone: 3, label: 'Tempo', lowPct: 75, highPct: 90 },
  { zone: 4, label: 'Limiar', lowPct: 90, highPct: 105 },
  { zone: 5, label: 'VO2max', lowPct: 105, highPct: 120 },
  { zone: 6, label: 'Capacidade anaeróbica', lowPct: 120, highPct: 150 },
  { zone: 7, label: 'Neuromuscular', lowPct: 150, highPct: null },
];

// ── Utilitários numéricos ────────────────────────────────────────

function round(n: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

function isNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

/**
 * Reamostra uma stream irregular (Strava "smart recording": valor mantido
 * constante entre pontos registrados) para 1Hz, do segundo 0 até o último
 * timestamp. Segurar o último valor conhecido é o comportamento correto
 * para esse esquema de gravação — não é uma aproximação por interpolação.
 */
export function resampleStepHold(timeSec: number[], values: number[] | null | undefined): number[] {
  const totalSec = timeSec.length > 0 ? Math.floor(timeSec[timeSec.length - 1]!) : 0;
  const out = new Array<number>(totalSec + 1).fill(0);
  if (!values || values.length === 0) return out;

  let sampleIdx = 0;
  let current = values[0] ?? 0;
  for (let sec = 0; sec <= totalSec; sec++) {
    while (sampleIdx < timeSec.length && timeSec[sampleIdx]! <= sec) {
      current = values[sampleIdx] ?? current;
      sampleIdx++;
    }
    out[sec] = current;
  }
  return out;
}

// `present` marca se a stream de origem EXISTE (não é um sensor ausente
// reamostrado como zero por resampleStepHold) — sem isso, "sem medidor de
// potência" e "potência média zero" ficam indistinguíveis (0 é um valor
// numérico válido, isNum(0) === true).
function minAvgMax(values: number[], startSec: number, endSec: number, present: boolean): MinAvgMax {
  if (!present) return { min: null, avg: null, max: null };
  let min = Infinity;
  let max = -Infinity;
  let sum = 0;
  let n = 0;
  for (let i = startSec; i <= endSec && i < values.length; i++) {
    const v = values[i]!;
    if (!isNum(v)) continue;
    if (v < min) min = v;
    if (v > max) max = v;
    sum += v;
    n++;
  }
  if (n === 0) return { min: null, avg: null, max: null };
  return { min: round(min, 1), avg: round(sum / n, 1), max: round(max, 1) };
}

function average(values: number[], startSec: number, endSec: number, present: boolean = true): number | null {
  if (!present) return null;
  let sum = 0;
  let n = 0;
  for (let i = startSec; i <= endSec && i < values.length; i++) {
    if (isNum(values[i])) {
      sum += values[i]!;
      n++;
    }
  }
  return n > 0 ? sum / n : null;
}

// ── Normalized Power (Coggan) ────────────────────────────────────

export function computeNormalizedPower(power1Hz: number[], startSec: number, endSec: number): number | null {
  const windowSize = 30;
  const n = endSec - startSec + 1;
  if (n < windowSize) return null;

  const rollingAverages: number[] = [];
  let windowSum = 0;
  const window: number[] = [];
  for (let i = startSec; i <= endSec; i++) {
    const v = power1Hz[i] ?? 0;
    window.push(v);
    windowSum += v;
    if (window.length > windowSize) {
      windowSum -= window.shift()!;
    }
    if (window.length === windowSize) {
      rollingAverages.push(windowSum / windowSize);
    }
  }
  if (rollingAverages.length === 0) return null;
  const meanFourth = rollingAverages.reduce((s, v) => s + v ** 4, 0) / rollingAverages.length;
  return Math.pow(meanFourth, 0.25);
}

// ── Elevação (ganho/perda) com suavização leve ───────────────────

export function computeElevationGainLoss(altitude1Hz: number[], startSec: number, endSec: number): { gainM: number; lossM: number } {
  const slice = altitude1Hz.slice(startSec, endSec + 1).filter(isNum);
  if (slice.length < 2) return { gainM: 0, lossM: 0 };

  // Suavização por média móvel (janela 7) pra reduzir ruído de GPS/barômetro.
  const windowSize = Math.min(7, slice.length);
  const smoothed: number[] = [];
  for (let i = 0; i < slice.length; i++) {
    const lo = Math.max(0, i - Math.floor(windowSize / 2));
    const hi = Math.min(slice.length - 1, i + Math.floor(windowSize / 2));
    let s = 0;
    for (let j = lo; j <= hi; j++) s += slice[j]!;
    smoothed.push(s / (hi - lo + 1));
  }

  let gain = 0;
  let loss = 0;
  const threshold = 0.3; // metros — ignora micro-oscilações
  for (let i = 1; i < smoothed.length; i++) {
    const delta = smoothed[i]! - smoothed[i - 1]!;
    if (delta > threshold) gain += delta;
    else if (delta < -threshold) loss += -delta;
  }
  return { gainM: round(gain, 1), lossM: round(loss, 1) };
}

// ── Decoupling (1ª metade vs 2ª metade) ──────────────────────────

function computeDecoupling(primary1Hz: number[], hr1Hz: number[], startSec: number, endSec: number): number | null {
  const n = endSec - startSec + 1;
  if (n < 60) return null; // precisa de pelo menos ~1min pra fazer sentido dividir ao meio
  const mid = startSec + Math.floor(n / 2);

  const primary1 = average(primary1Hz, startSec, mid - 1);
  const hr1 = average(hr1Hz, startSec, mid - 1);
  const primary2 = average(primary1Hz, mid, endSec);
  const hr2 = average(hr1Hz, mid, endSec);

  if (!primary1 || !hr1 || !primary2 || !hr2 || hr1 === 0 || hr2 === 0) return null;

  const ratio1 = primary1 / hr1;
  const ratio2 = primary2 / hr2;
  if (ratio1 === 0) return null;

  return round(((ratio1 - ratio2) / ratio1) * 100, 2);
}

// ── Curva de potência (melhores médias móveis por duração) ───────

export function computePeakPowerCurve(power1Hz: number[], startSec: number, endSec: number, durations: number[] = POWER_PEAK_DURATIONS_SEC): Record<string, number | null> {
  const n = endSec - startSec + 1;
  // prefix[i] = soma de power1Hz[startSec .. startSec+i-1]
  const prefix = new Array<number>(n + 1).fill(0);
  for (let i = 0; i < n; i++) {
    prefix[i + 1] = prefix[i]! + (power1Hz[startSec + i] ?? 0);
  }

  const result: Record<string, number | null> = {};
  for (const d of durations) {
    if (d > n) {
      result[String(d)] = null;
      continue;
    }
    let best = -Infinity;
    for (let i = 0; i + d <= n; i++) {
      const windowSum = prefix[i + d]! - prefix[i]!;
      const avg = windowSum / d;
      if (avg > best) best = avg;
    }
    result[String(d)] = round(best, 1);
  }
  return result;
}

// ── Melhor esforço de pace (menor tempo pra cobrir X metros) ─────

export function computeBestEffortPace(distance1Hz: number[], startSec: number, endSec: number, targetDistancesM: number[]): Record<string, number | null> {
  const result: Record<string, number | null> = {};
  const slice = distance1Hz.slice(startSec, endSec + 1);
  const n = slice.length;
  if (n === 0 || targetDistancesM.length === 0) return result;

  const base = slice[0] ?? 0;
  const rel = slice.map((d) => (isNum(d) ? d - base : 0));

  for (const target of targetDistancesM) {
    let bestSec: number | null = null;
    let j = 0;
    for (let i = 0; i < n; i++) {
      if (j < i) j = i;
      while (j < n && rel[j]! - rel[i]! < target) j++;
      if (j >= n) break;
      const dt = j - i;
      if (bestSec === null || dt < bestSec) bestSec = dt;
    }
    result[String(target)] = bestSec;
  }
  return result;
}

// ── Zonas (tempo em cada faixa, como % de FTP ou %FCmax) ─────────

function computeZones(
  values1Hz: number[],
  startSec: number,
  endSec: number,
  threshold: number,
  zoneDefs: { zone: number; label: string; lowPct: number; highPct: number | null }[],
): ZoneResult[] {
  const counts = new Array(zoneDefs.length).fill(0);
  let total = 0;
  for (let i = startSec; i <= endSec && i < values1Hz.length; i++) {
    const v = values1Hz[i];
    if (!isNum(v) || v <= 0) continue;
    const pct = (v / threshold) * 100;
    let zoneIdx = zoneDefs.length - 1;
    for (let z = 0; z < zoneDefs.length; z++) {
      const def = zoneDefs[z]!;
      if (pct >= def.lowPct && (def.highPct === null || pct < def.highPct)) {
        zoneIdx = z;
        break;
      }
    }
    counts[zoneIdx]++;
    total++;
  }
  return zoneDefs.map((def, i) => ({
    zone: def.zone,
    label: def.label,
    lowPct: def.lowPct,
    highPct: def.highPct,
    secs: counts[i],
    pct: total > 0 ? round((counts[i] / total) * 100, 1) : 0,
  }));
}

// ── TSS via FC (fallback quando não há potência/FTP) ─────────────
// Estimativa quadrática simples (%FCmax)² × horas × 100 — usada quando não
// há potência+FTP disponíveis para o cálculo real (Coggan). Compartilhada
// com o PMC (performance.service.ts) pra manter uma única fonte de verdade.

export function estimateHrTss(durationSec: number, avgHr: number | null, maxHr: number | null): number {
  if (!avgHr || !maxHr || maxHr === 0) {
    return round((durationSec / 60) * 0.7, 1);
  }
  const hrRatio = avgHr / maxHr;
  const intensityFactor = hrRatio * hrRatio;
  return round((durationSec / 3600) * intensityFactor * 100, 1);
}

// ── Análise de um segmento (lap ou atividade inteira) ────────────

interface ResampledStreams {
  power: number[]; hr: number[]; cadence: number[]; speed: number[];
  altitude: number[]; grade: number[]; temp: number[]; distance: number[]; moving: number[];
  hasPower: boolean; hasHr: boolean; hasCadence: boolean; hasSpeed: boolean;
  hasAltitude: boolean; hasGrade: boolean; hasTemp: boolean; hasDistance: boolean; hasMoving: boolean;
}

function analyzeSegment(
  resampled: ResampledStreams,
  startSec: number,
  endSec: number,
  discipline: Discipline,
  ctx: AthleteContext,
): SegmentMetrics {
  const durationSec = endSec - startSec + 1;

  const power = minAvgMax(resampled.power, startSec, endSec, resampled.hasPower);
  const heartRate = minAvgMax(resampled.hr, startSec, endSec, resampled.hasHr);
  const cadence = minAvgMax(resampled.cadence, startSec, endSec, resampled.hasCadence);
  const speedMs = minAvgMax(resampled.speed, startSec, endSec, resampled.hasSpeed);
  const altitudeM = minAvgMax(resampled.altitude, startSec, endSec, resampled.hasAltitude);
  const tempC = minAvgMax(resampled.temp, startSec, endSec, resampled.hasTemp);
  const { gainM, lossM } = resampled.hasAltitude
    ? computeElevationGainLoss(resampled.altitude, startSec, endSec)
    : { gainM: null, lossM: null };
  const avgGradePct = average(resampled.grade, startSec, endSec, resampled.hasGrade);

  const distStart = resampled.distance[startSec];
  const distEnd = resampled.distance[Math.min(endSec, resampled.distance.length - 1)];
  const distanceM = resampled.hasDistance && isNum(distStart) && isNum(distEnd)
    ? round(distEnd - distStart, 1)
    : null;

  // Tempo em movimento real (stream "moving" do Strava) — distinto da duração
  // decorrida quando há paradas (semáforo, apoio). Sem essa stream, assume
  // que a atividade toda foi "em movimento" (comportamento anterior).
  const movingSec = resampled.hasMoving
    ? Math.round(average(resampled.moving, startSec, endSec, true)! * durationSec)
    : durationSec;

  const hasPowerSignal = power.avg != null && power.avg > 0;
  const npWatts = hasPowerSignal ? computeNormalizedPower(resampled.power, startSec, endSec) : null;
  const workKj = hasPowerSignal ? round((power.avg! * durationSec) / 1000, 2) : null;
  const wPerKg = hasPowerSignal && ctx.weightKg ? round(power.avg! / ctx.weightKg, 2) : null;
  const viValue = npWatts && power.avg ? round(npWatts / power.avg, 3) : null;
  const efValue = npWatts && heartRate.avg ? round(npWatts / heartRate.avg, 2) : null;

  let ifValue: number | null = null;
  let tss: number | null = null;
  let tssMethod: 'power' | 'hr' | null = null;
  if (discipline === 'bike' && npWatts && ctx.ftpWatts) {
    ifValue = round(npWatts / ctx.ftpWatts, 3);
    tss = round(((durationSec * npWatts * ifValue) / (ctx.ftpWatts * 3600)) * 100, 1);
    tssMethod = 'power';
  } else if (heartRate.avg) {
    tss = estimateHrTss(durationSec, heartRate.avg, ctx.maxHr ?? null);
    tssMethod = 'hr';
  }

  const decouplingSource = hasPowerSignal ? resampled.power : resampled.speed;
  const pwHrDecouplingPct = heartRate.avg ? computeDecoupling(decouplingSource, resampled.hr, startSec, endSec) : null;
  const vamMhr = gainM != null && gainM > 0 ? round(gainM / (durationSec / 3600), 0) : null;

  return {
    durationSec,
    movingSec,
    distanceM,
    elevGainM: gainM,
    elevLossM: lossM,
    avgGradePct: avgGradePct != null ? round(avgGradePct, 1) : null,
    power,
    heartRate,
    cadence,
    speedMs,
    altitudeM,
    tempC,
    npWatts: npWatts != null ? round(npWatts, 0) : null,
    ifValue,
    viValue,
    efValue,
    pwHrDecouplingPct,
    vamMhr,
    tss,
    tssMethod,
    workKj,
    wPerKg,
  };
}

// ── Orquestrador principal ────────────────────────────────────────

export function analyzeActivity(
  streams: StreamData,
  laps: LapInput[],
  discipline: Discipline,
  ctx: AthleteContext,
): AnalysisResult {
  const timeSec = streams.timeSec;
  const movingAsNumber = streams.moving ? streams.moving.map((m) => (m ? 1 : 0)) : null;
  const present = (s: unknown[] | null | undefined) => !!s && s.length > 0;

  const resampled: ResampledStreams = {
    power: resampleStepHold(timeSec, streams.watts),
    hr: resampleStepHold(timeSec, streams.heartRate),
    cadence: resampleStepHold(timeSec, streams.cadence),
    speed: resampleStepHold(timeSec, streams.velocityMs),
    altitude: resampleStepHold(timeSec, streams.altitudeM),
    grade: resampleStepHold(timeSec, streams.gradePct),
    temp: resampleStepHold(timeSec, streams.tempC),
    distance: resampleStepHold(timeSec, streams.distanceM),
    moving: resampleStepHold(timeSec, movingAsNumber),
    hasPower: present(streams.watts),
    hasHr: present(streams.heartRate),
    hasCadence: present(streams.cadence),
    hasSpeed: present(streams.velocityMs),
    hasAltitude: present(streams.altitudeM),
    hasGrade: present(streams.gradePct),
    hasTemp: present(streams.tempC),
    hasDistance: present(streams.distanceM),
    hasMoving: present(streams.moving),
  };

  const totalEndSec = resampled.power.length - 1;
  const summary = analyzeSegment(resampled, 0, totalEndSec, discipline, ctx);

  const peaks: PeakEfforts = {
    power: summary.power.avg ? computePeakPowerCurve(resampled.power, 0, totalEndSec) : {},
    pace: computeBestEffortPace(resampled.distance, 0, totalEndSec, PACE_TARGET_DISTANCES_M[discipline] ?? []),
  };

  const zones = {
    hr: ctx.maxHr ? computeZones(resampled.hr, 0, totalEndSec, ctx.maxHr, HR_ZONES) : [],
    power: discipline === 'bike' && ctx.ftpWatts ? computeZones(resampled.power, 0, totalEndSec, ctx.ftpWatts, POWER_ZONES) : [],
  };

  const lapAnalyses: LapAnalysis[] = laps.map((lap) => {
    const startSec = Math.max(0, Math.min(Math.floor(lap.startOffsetSec), totalEndSec));
    const endSec = Math.max(startSec, Math.min(Math.floor(lap.endOffsetSec), totalEndSec));
    const metrics = analyzeSegment(resampled, startSec, endSec, discipline, ctx);
    return {
      ...metrics,
      lapIndex: lap.lapIndex,
      startOffsetSec: startSec,
      name: lap.name ?? null,
    };
  });

  return {
    version: 1,
    computedAt: new Date().toISOString(),
    discipline,
    inputs: {
      ftpWatts: ctx.ftpWatts ?? null,
      maxHr: ctx.maxHr ?? null,
      weightKg: ctx.weightKg ?? null,
    },
    summary,
    peaks,
    zones,
    laps: lapAnalyses,
  };
}
