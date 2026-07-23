// ── Teste Aero guiado (método Chung / "virtual elevation") ────────
//
// Fase 2 da análise aerodinâmica. Diferente do CdA passivo (aero.ts), aqui o
// atleta pedala um PROTOCOLO controlado — trecho plano, ida-e-volta ou laps,
// uma volta por posição — e o método resolve CdA E Crr de uma vez, com muito
// mais precisão, porque:
//   • o ida-e-volta CANCELA o vento estável (vai e volta na mesma direção);
//   • o fechamento do loop (a elevação virtual tem que voltar à altitude real)
//     SEPARA o CdA do Crr, que no passivo ficam correlacionados.
//
// Virtual elevation (Chung): pra um dado (CdA, Crr), integra a inclinação
// "virtual" implícita no balanço de potência a cada segundo:
//   sinθ = P_roda/(v·m·g) − ½·ρ·CdA·v²/(m·g) − Crr − a/g
//   Ve[i] = Ve[i-1] + sinθ·Δd
// Pros valores corretos, Ve casa com a altitude medida. Otimizo (CdA, Crr)
// minimizando o RMSE entre Ve e a altitude (busca em grade + refino).
//
// Comparação de posições: fixo o Crr do teste inteiro e resolvo o CdA por lap
// (cada lap = uma posição rotulável). Módulo PURO, no padrão de aero.ts.

import { airDensity, type AeroStreams } from './aero.js';

// ── Constantes ────────────────────────────────────────────────────

const G = 9.80665;
const RHO_REF = 1.225;            // ρ ref (nível do mar, 15 °C) p/ tradução em W
const V_40KMH_MS = 40 / 3.6;
const V_FLOOR = 1.5;              // piso de velocidade nos denominadores (evita blow-up em quase-parada)

const DEFAULT_BIKE_KG = 8.0;
const DEFAULT_RIDER_KG = 75;
const DEFAULT_DRIVETRAIN_EFF = 0.975;

// Faixas de busca.
const CDA_MIN = 0.15;
const CDA_MAX = 0.45;
const CRR_MIN = 0.002;
const CRR_MAX = 0.014;

const MIN_LAP_SECS = 45;         // lap curto demais não fecha nada

// ── Tipos ─────────────────────────────────────────────────────────

export interface AeroTestSetup {
  bikeWeightKg: number | null;
  crr: number | null;            // dica/fallback; o teste resolve o Crr real
  drivetrainEff: number | null;
}

export interface AeroTestAthlete {
  weightKg?: number | null;
}

export interface AeroTestLapInput {
  lapIndex: number;
  startSec: number;
  endSec: number;
  label?: string | null;
}

export type AeroConfidenceTier = 'low' | 'medium' | 'high';

export interface AeroTestLapResult {
  lapIndex: number;
  label: string | null;
  cdaM2: number;
  wattsAt40kmh: number;
  fitRmseM: number;
  sampleSecs: number;
  speed: { minMs: number; maxMs: number; avgMs: number };
  deltaWattsVsBest: number;      // Δ em W a 40 km/h vs a melhor posição (0 = a melhor)
}

export interface AeroTestResult {
  version: 1;
  method: 'chung-virtual-elevation';
  crr: number;                   // Crr resolvido do teste inteiro
  crrFromSetup: number | null;   // Crr do pneu cadastrado (comparação)
  systemMassKg: number;
  riderWeightKg: number | null;
  bikeWeightKg: number;
  drivetrainEff: number;
  overall: { cdaM2: number; wattsAt40kmh: number; fitRmseM: number };
  laps: AeroTestLapResult[];
  bestLapIndex: number | null;
  confidence: { tier: AeroConfidenceTier; score: number; reasons: string[] };
  usedDefaults: boolean;
}

// ── Utilitários ───────────────────────────────────────────────────

function round(n: number, d: number): number {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}
function clamp01(n: number): number {
  return n < 0 ? 0 : n > 1 ? 1 : n;
}
function isNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}
function wattsAt40(cda: number): number {
  return 0.5 * RHO_REF * cda * V_40KMH_MS ** 3;
}

// ── Virtual elevation + erro de ajuste (RMSE vs altitude) ────────

function fitRmse(
  s: AeroStreams,
  start: number,
  end: number,
  mass: number,
  eff: number,
  cda: number,
  crr: number,
): number {
  let ve = s.altitude[start] ?? 0;
  let sumSq = 0;
  let n = 0;
  for (let i = start + 1; i <= end; i++) {
    const v = s.speed[i]!;
    const vd = v < V_FLOOR ? V_FLOOR : v;
    const a = v - s.speed[i - 1]!;
    const pw = (s.power[i] ?? 0) * eff;
    const rho = airDensity(s.altitude[i], s.temp[i]);
    const sinT = pw / (vd * mass * G) - (0.5 * rho * cda * v * v) / (mass * G) - crr - a / G;
    ve += sinT * v; // Δd = v·dt, dt = 1s
    const alt = s.altitude[i];
    if (isNum(alt)) {
      const r = ve - alt;
      sumSq += r * r;
      n++;
    }
  }
  return n > 0 ? Math.sqrt(sumSq / n) : Infinity;
}

// Busca 2D (CdA, Crr) por grade grossa + refino. Retorna o melhor ajuste.
function fitCdaCrr(s: AeroStreams, start: number, end: number, mass: number, eff: number) {
  let best = { cda: NaN, crr: NaN, rmse: Infinity };
  const scan = (cLo: number, cHi: number, cStep: number, rLo: number, rHi: number, rStep: number) => {
    for (let cda = cLo; cda <= cHi + 1e-9; cda += cStep) {
      for (let crr = rLo; crr <= rHi + 1e-9; crr += rStep) {
        const rmse = fitRmse(s, start, end, mass, eff, cda, crr);
        if (rmse < best.rmse) best = { cda, crr, rmse };
      }
    }
  };
  scan(CDA_MIN, CDA_MAX, 0.01, CRR_MIN, CRR_MAX, 0.0005);
  scan(
    Math.max(CDA_MIN, best.cda - 0.01), Math.min(CDA_MAX, best.cda + 0.01), 0.002,
    Math.max(CRR_MIN, best.crr - 0.0005), Math.min(CRR_MAX, best.crr + 0.0005), 0.0001,
  );
  return best;
}

// CdA por lap com Crr FIXO (comparação de posições) — busca 1D + refino.
function fitCdaGivenCrr(s: AeroStreams, start: number, end: number, mass: number, eff: number, crr: number) {
  let best = { cda: NaN, rmse: Infinity };
  const scan = (lo: number, hi: number, step: number) => {
    for (let cda = lo; cda <= hi + 1e-9; cda += step) {
      const rmse = fitRmse(s, start, end, mass, eff, cda, crr);
      if (rmse < best.rmse) best = { cda, rmse };
    }
  };
  scan(CDA_MIN, CDA_MAX, 0.005);
  scan(Math.max(CDA_MIN, best.cda - 0.005), Math.min(CDA_MAX, best.cda + 0.005), 0.001);
  return best;
}

function speedStats(s: AeroStreams, start: number, end: number) {
  let min = Infinity, max = -Infinity, sum = 0, n = 0;
  for (let i = start; i <= end; i++) {
    const v = s.speed[i];
    if (!isNum(v)) continue;
    if (v < min) min = v;
    if (v > max) max = v;
    sum += v; n++;
  }
  return n > 0
    ? { minMs: round(min, 2), maxMs: round(max, 2), avgMs: round(sum / n, 2) }
    : { minMs: 0, maxMs: 0, avgMs: 0 };
}

// ── Orquestrador ──────────────────────────────────────────────────

export function runAeroTest(
  streams: AeroStreams,
  laps: AeroTestLapInput[],
  athlete: AeroTestAthlete,
  setup: AeroTestSetup,
): AeroTestResult | null {
  // Precisa de potência, velocidade E altitude (o método casa Ve com a altitude).
  if (!streams.hasPower || !streams.hasSpeed || !streams.hasAltitude) return null;

  const riderWeightKg = isNum(athlete.weightKg) ? athlete.weightKg : null;
  const bikeWeightKg = isNum(setup.bikeWeightKg) ? setup.bikeWeightKg : DEFAULT_BIKE_KG;
  const eff = isNum(setup.drivetrainEff) && setup.drivetrainEff > 0 ? setup.drivetrainEff : DEFAULT_DRIVETRAIN_EFF;
  const usedDefaults = !isNum(setup.bikeWeightKg) || riderWeightKg === null;
  const mass = (riderWeightKg ?? DEFAULT_RIDER_KG) + bikeWeightKg;

  const total = streams.speed.length - 1;
  if (total < MIN_LAP_SECS) return null;

  // Ajuste global → resolve o Crr do teste (e um CdA médio).
  const overall = fitCdaCrr(streams, 0, total, mass, eff);
  if (!Number.isFinite(overall.rmse)) return null;
  const crr = round(overall.crr, 4);

  // Laps válidos (>= MIN_LAP_SECS). Sem laps utilizáveis → trata o teste inteiro
  // como uma "posição" única.
  const validLaps = laps
    .map((l) => ({
      lapIndex: l.lapIndex,
      label: l.label ?? null,
      startSec: Math.max(0, Math.min(Math.floor(l.startSec), total)),
      endSec: Math.max(0, Math.min(Math.floor(l.endSec), total)),
    }))
    .filter((l) => l.endSec - l.startSec >= MIN_LAP_SECS);

  const segments = validLaps.length > 0
    ? validLaps
    : [{ lapIndex: 1, label: null as string | null, startSec: 0, endSec: total }];

  // CdA por lap com o Crr do teste fixo.
  const lapResults: AeroTestLapResult[] = segments.map((seg) => {
    const fit = fitCdaGivenCrr(streams, seg.startSec, seg.endSec, mass, eff, overall.crr);
    const cda = round(fit.cda, 3);
    return {
      lapIndex: seg.lapIndex,
      label: seg.label,
      cdaM2: cda,
      wattsAt40kmh: round(wattsAt40(cda), 0),
      fitRmseM: round(fit.rmse, 2),
      sampleSecs: seg.endSec - seg.startSec + 1,
      speed: speedStats(streams, seg.startSec, seg.endSec),
      deltaWattsVsBest: 0, // preenchido abaixo
    };
  });

  // Melhor posição = menor CdA; Δ watts vs ela.
  let bestIdx = 0;
  for (let i = 1; i < lapResults.length; i++) {
    if (lapResults[i]!.cdaM2 < lapResults[bestIdx]!.cdaM2) bestIdx = i;
  }
  const bestW = lapResults[bestIdx]!.wattsAt40kmh;
  for (const lr of lapResults) lr.deltaWattsVsBest = round(lr.wattsAt40kmh - bestW, 0);

  // ── Confiança: guiada pelo RMSE do ajuste (quão bem Ve fechou) ──
  const avgRmse = lapResults.reduce((s, l) => s + l.fitRmseM, 0) / lapResults.length;
  const rmseScore = clamp01(1 - avgRmse / 5); // < ~0.5m ótimo; > 5m ruim
  const lapScore = clamp01(segments.length / 2); // 2+ posições = comparação cheia
  const durScore = clamp01((total + 1) / 600);
  const score = clamp01(0.6 * rmseScore + 0.2 * lapScore + 0.2 * durScore);

  const reasons: string[] = [];
  reasons.push('protocolo assume vento calmo — faça ida-e-volta pra cancelar vento');
  if (usedDefaults) reasons.push('setup padrão — cadastre sua bike (peso) em Minhas bikes');
  if (avgRmse > 2.5) reasons.push('ajuste ruidoso (trecho não plano/estável o suficiente)');
  if (segments.length < 2) reasons.push('só uma volta — para comparar posições, faça uma volta por posição');

  let tier: AeroConfidenceTier;
  if (avgRmse <= 1.5 && score >= 0.7) tier = 'high';
  else if (avgRmse <= 3.5 && score >= 0.4) tier = 'medium';
  else tier = 'low';

  return {
    version: 1,
    method: 'chung-virtual-elevation',
    crr,
    crrFromSetup: isNum(setup.crr) ? round(setup.crr, 4) : null,
    systemMassKg: round(mass, 1),
    riderWeightKg,
    bikeWeightKg: round(bikeWeightKg, 1),
    drivetrainEff: round(eff, 3),
    overall: {
      cdaM2: round(overall.cda, 3),
      wattsAt40kmh: round(wattsAt40(overall.cda), 0),
      fitRmseM: round(overall.rmse, 2),
    },
    laps: lapResults,
    bestLapIndex: lapResults.length > 1 ? lapResults[bestIdx]!.lapIndex : null,
    confidence: { tier, score: round(score, 2), reasons },
    usedDefaults,
  };
}
