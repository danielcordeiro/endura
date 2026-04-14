import { eq, and, gte, lte, desc, asc } from 'drizzle-orm';
import { db } from '../../lib/db.js';
import * as schema from '../../../drizzle/schema.js';
import { generateStructuredJSON, CLAUDE_MODELS } from '../../lib/claude.js';
import { getLatestWellness } from '../integration/wellness-sync.service.js';

// ── Types ─────────────────────────────────────────────────────────

interface DailyMetric {
  date: string;
  tss: number;
  ctl: number;
  atl: number;
  tsb: number;
  hrvMs: number | null;
  restingHr: number | null;
  fatigueScore: number | null;
  readinessScore: number | null;
  readinessLevel: string | null;
}

interface PMCData {
  metrics: DailyMetric[];
  currentCTL: number;
  currentATL: number;
  currentTSB: number;
}

interface ReadinessAssessment {
  level: 'intense' | 'moderate' | 'light' | 'rest';
  score: number;
  factors: {
    tsb: number;
    tsbTrend: 'rising' | 'falling' | 'stable';
    ctl: number;
    recentLoadTrend: 'increasing' | 'decreasing' | 'stable';
    sleepQuality: number | null;
    hrvStatus: 'above' | 'below' | 'normal' | 'unknown';
  };
  recommendation: string;
  mentorMessage: string;
}

interface RacePrediction {
  totalTimeSec: number;
  swimTimeSec: number;
  bikeTimeSec: number;
  runTimeSec: number;
  t1Sec: number;
  t2Sec: number;
  confidence: number;
  factors: {
    swimPace100m: number;
    bikePowerW: number | null;
    bikeSpeedKmh: number;
    runPaceKm: number;
    fitnessLevel: number;
    bikeElevationGainM: number | null;
    runElevationGainM: number | null;
  };
}

interface TargetRace {
  id: string;
  raceName: string | null;
  distance: string;
  raceDate: string;
  targetTime: number | null;
  daysRemaining: number;
  readinessScore: number | null;
  prediction: RacePrediction | null;
  planPhase: string | null;
  planProgress: number | null;
}

// ── Helpers ───────────────────────────────────────────────────────

function getTodayStr(): string {
  return new Date().toISOString().split('T')[0]!;
}

function daysBetween(dateStr: string): number {
  const target = new Date(dateStr + 'T00:00:00');
  const today = new Date(getTodayStr() + 'T00:00:00');
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function dateAddDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0]!;
}

/** Estimate TSS from HR data when no power meter is available */
function estimateHrTSS(durationSec: number, avgHr: number | null, maxHr: number | null): number {
  if (!avgHr || !maxHr || maxHr === 0) {
    // Fallback: duration-based estimate (1 TSS per minute at moderate effort)
    return Math.round((durationSec / 60) * 0.7);
  }
  const hrRatio = avgHr / maxHr;
  const intensityFactor = hrRatio * hrRatio; // Quadratic scaling
  return Math.round((durationSec / 3600) * intensityFactor * 100);
}

// ── PMC Calculation (CTL / ATL / TSB) ────────────────────────────

export async function calculatePMC(userId: string, days: number = 90): Promise<PMCData> {
  const today = getTodayStr();
  const startDate = dateAddDays(today, -(days + 42)); // Extra 42 days for CTL ramp-up

  // Fetch all activities in the period
  const activities = await db.query.activities.findMany({
    where: and(
      eq(schema.activities.userId, userId),
      gte(schema.activities.startedAt, new Date(startDate + 'T00:00:00')),
      lte(schema.activities.startedAt, new Date(today + 'T23:59:59')),
    ),
    orderBy: [asc(schema.activities.startedAt)],
  });

  // Get athlete profile for maxHr
  const profile = await db.query.athleteProfiles.findFirst({
    where: eq(schema.athleteProfiles.userId, userId),
  });
  const maxHr = profile?.maxHr ?? 185;

  // Build daily TSS map
  const dailyTSS = new Map<string, number>();
  for (const act of activities) {
    const dateStr = act.startedAt.toISOString().split('T')[0]!;
    const tss = estimateHrTSS(
      Number(act.durationSec ?? 0),
      act.avgHr,
      maxHr,
    );
    dailyTSS.set(dateStr, (dailyTSS.get(dateStr) ?? 0) + tss);
  }

  // Calculate exponential moving averages
  const metrics: DailyMetric[] = [];
  let ctl = 0;
  let atl = 0;

  const totalDays = days + 42 + 1; // +1 to include today
  for (let i = 0; i < totalDays; i++) {
    const dateStr = dateAddDays(startDate, i);
    const tss = dailyTSS.get(dateStr) ?? 0;

    // Exponential decay: CTL (42-day), ATL (7-day)
    ctl = ctl + (tss - ctl) / 42;
    atl = atl + (tss - atl) / 7;
    const tsb = ctl - atl;

    // Only include the requested range in output
    if (i >= 42) {
      metrics.push({
        date: dateStr,
        tss: Math.round(tss * 10) / 10,
        ctl: Math.round(ctl * 10) / 10,
        atl: Math.round(atl * 10) / 10,
        tsb: Math.round(tsb * 10) / 10,
        hrvMs: null,
        restingHr: null,
        fatigueScore: null,
        readinessScore: null,
        readinessLevel: null,
      });
    }
  }

  const current = metrics[metrics.length - 1];

  return {
    metrics,
    currentCTL: current?.ctl ?? 0,
    currentATL: current?.atl ?? 0,
    currentTSB: current?.tsb ?? 0,
  };
}

// ── Weekly Load Metrics (Monotony & Strain) ──────────────────────

export function calculateWeeklyLoadMetrics(metrics: DailyMetric[]): {
  weeklyTSS: number;
  monotony: number;
  strain: number;
} {
  const last7 = metrics.slice(-7);
  const tssValues = last7.map((m) => m.tss);
  const weeklyTSS = tssValues.reduce((sum, v) => sum + v, 0);
  const avgTSS = weeklyTSS / 7;
  const stdDev = Math.sqrt(
    tssValues.reduce((sum, v) => sum + (v - avgTSS) ** 2, 0) / 7,
  );
  const monotony = stdDev > 0 ? Math.round((avgTSS / stdDev) * 10) / 10 : 0;
  const strain = Math.round(weeklyTSS * monotony * 10) / 10;

  return { weeklyTSS: Math.round(weeklyTSS), monotony, strain };
}

// ── Readiness Assessment (AI Mentor) ─────────────────────────────

export interface SubjectiveInput {
  feeling: number;       // 1-5 (1=pessimo, 5=otimo)
  muscleSoreness: number; // 1-5 (1=nenhuma, 5=muito alta)
  injuryNote: string | null; // texto livre sobre lesao/dor
}

export async function assessReadiness(userId: string, pmc: PMCData, subjective?: SubjectiveInput | null): Promise<ReadinessAssessment> {
  const { currentCTL, currentATL, currentTSB, metrics } = pmc;

  // TSB trend (last 3 days)
  const last3TSB = metrics.slice(-3).map((m) => m.tsb);
  let tsbTrend: 'rising' | 'falling' | 'stable' = 'stable';
  if (last3TSB.length >= 3) {
    const diff = last3TSB[2]! - last3TSB[0]!;
    if (diff > 3) tsbTrend = 'rising';
    else if (diff < -3) tsbTrend = 'falling';
  }

  // Recent load trend (7-day ATL vs 14-day avg ATL)
  const last7ATL = metrics.slice(-7).reduce((s, m) => s + m.atl, 0) / 7;
  const prev7ATL = metrics.slice(-14, -7).reduce((s, m) => s + m.atl, 0) / Math.max(metrics.slice(-14, -7).length, 1);
  let recentLoadTrend: 'increasing' | 'decreasing' | 'stable' = 'stable';
  if (last7ATL > prev7ATL * 1.1) recentLoadTrend = 'increasing';
  else if (last7ATL < prev7ATL * 0.9) recentLoadTrend = 'decreasing';

  // Latest weekly checkin for sleep quality (fallback)
  const latestCheckin = await db.query.weeklyCheckins.findFirst({
    where: eq(schema.weeklyCheckins.userId, userId),
    orderBy: [desc(schema.weeklyCheckins.createdAt)],
  });

  // Fetch real wellness data from intervals.icu
  const wellness = await getLatestWellness(userId);
  const sleepQuality = wellness?.sleepScore != null
    ? Math.round(wellness.sleepScore / 20)  // 0-100 → 1-5
    : latestCheckin?.sleepQuality ?? null;

  // HRV status: compare today vs 7-day average
  let hrvStatus: 'above' | 'below' | 'normal' | 'unknown' = 'unknown';
  let hrvContext = '';
  if (wellness?.hrv != null) {
    // Fetch last 7 days of HRV to compute baseline
    const recentWellness = await db.query.dailyMetrics.findMany({
      where: and(
        eq(schema.dailyMetrics.userId, userId),
        eq(schema.dailyMetrics.source, 'intervals_icu'),
      ),
      orderBy: (dm, { desc: d }) => [d(dm.date)],
      limit: 7,
    });
    const hrvValues = recentWellness
      .filter((r) => r.hrvMs != null)
      .map((r) => Number(r.hrvMs));
    if (hrvValues.length >= 3) {
      const avgHrv = hrvValues.reduce((a, b) => a + b, 0) / hrvValues.length;
      if (wellness.hrv > avgHrv * 1.05) hrvStatus = 'above';
      else if (wellness.hrv < avgHrv * 0.9) hrvStatus = 'below';
      else hrvStatus = 'normal';
      hrvContext = `HRV hoje: ${wellness.hrv.toFixed(0)}ms (baseline 7d: ${avgHrv.toFixed(0)}ms)`;
    }
  }

  // Calculate readiness score (0-100)
  let score = 50; // baseline

  // TSB contribution (-20 to +30)
  if (currentTSB > 15) score += 25;
  else if (currentTSB > 5) score += 15;
  else if (currentTSB > -5) score += 5;
  else if (currentTSB > -15) score -= 10;
  else score -= 20;

  // TSB trend contribution (-10 to +10)
  if (tsbTrend === 'rising') score += 10;
  else if (tsbTrend === 'falling') score -= 10;

  // Sleep quality contribution (-15 to +15)
  if (sleepQuality != null) {
    if (sleepQuality >= 4) score += 15;
    else if (sleepQuality >= 3) score += 5;
    else if (sleepQuality <= 1) score -= 15;
    else score -= 5;
  }

  // HRV contribution (-10 to +10)
  if (hrvStatus === 'above') score += 10;
  else if (hrvStatus === 'below') score -= 10;

  // Body battery from Garmin (-10 to +10)
  if (wellness?.bodyBattery != null) {
    if (wellness.bodyBattery >= 70) score += 10;
    else if (wellness.bodyBattery >= 40) score += 3;
    else if (wellness.bodyBattery < 25) score -= 10;
  }

  // Stress level from Garmin (-8 to +5)
  if (wellness?.stressLevel != null) {
    if (wellness.stressLevel <= 25) score += 5;
    else if (wellness.stressLevel >= 60) score -= 8;
  }

  // CTL indicates fitness level — very low CTL means low capacity
  if (currentCTL < 20) score -= 10;
  else if (currentCTL > 60) score += 5;

  // Monotony check (last 7 days)
  const { monotony } = calculateWeeklyLoadMetrics(metrics);
  if (monotony > 2) score -= 10; // High monotony = injury risk

  // Subjective input adjustment
  let feelingLabel = '';
  let sorenessLabel = '';
  let injuryContext = '';
  if (subjective) {
    // Feeling: 1=pessimo(-25), 2=ruim(-12), 3=ok(0), 4=bom(+8), 5=otimo(+15)
    const feelingAdj = [-25, -12, 0, 8, 15][subjective.feeling - 1] ?? 0;
    score += feelingAdj;
    feelingLabel = ['pessimo', 'ruim', 'ok', 'bom', 'otimo'][subjective.feeling - 1] ?? 'ok';

    // Muscle soreness: 1=nenhuma(+5), 2=leve(0), 3=moderada(-10), 4=alta(-20), 5=muito alta(-30)
    const sorenessAdj = [5, 0, -10, -20, -30][subjective.muscleSoreness - 1] ?? 0;
    score += sorenessAdj;
    sorenessLabel = ['nenhuma', 'leve', 'moderada', 'alta', 'muito alta'][subjective.muscleSoreness - 1] ?? '';

    // Injury: any injury note forces light or rest
    if (subjective.injuryNote && subjective.injuryNote.trim().length > 0) {
      score = Math.min(score, 20); // Cap at rest/light
      injuryContext = subjective.injuryNote.trim();
    }
  }

  score = Math.max(0, Math.min(100, score));

  // Determine level
  let level: 'intense' | 'moderate' | 'light' | 'rest';
  if (score >= 75) level = 'intense';
  else if (score >= 50) level = 'moderate';
  else if (score >= 25) level = 'light';
  else level = 'rest';

  // Generate mentor message with AI
  let mentorMessage = getDefaultMentorMessage(level, currentTSB, currentCTL);
  let recommendation = getDefaultRecommendation(level);

  const subjectivePrompt = subjective
    ? `\n- Sensacao do atleta: ${feelingLabel} (${subjective.feeling}/5)\n- Dor muscular: ${sorenessLabel} (${subjective.muscleSoreness}/5)${injuryContext ? `\n- Relato de lesao/dor: "${injuryContext}"` : ''}`
    : '';

  const wellnessPrompt = wellness
    ? `\n- HRV: ${wellness.hrv != null ? `${wellness.hrv.toFixed(0)}ms (${hrvStatus})` : 'indisponivel'}${hrvContext ? ` — ${hrvContext}` : ''}
- Sono: ${wellness.sleepDurationH != null ? `${wellness.sleepDurationH}h` : 'indisponivel'}${wellness.sleepScore != null ? ` (score: ${wellness.sleepScore}/100)` : ''}
- Body Battery: ${wellness.bodyBattery != null ? `${wellness.bodyBattery}/100` : 'indisponivel'}
- Stress: ${wellness.stressLevel != null ? `${wellness.stressLevel}/100` : 'indisponivel'}
- SpO2: ${wellness.spo2 != null ? `${wellness.spo2}%` : 'indisponivel'}`
    : '';

  try {
    const aiResponse = await generateStructuredJSON<{ mentorMessage: string; recommendation: string }>({
      model: CLAUDE_MODELS.HAIKU,
      maxTokens: 400,
      system: `Voce e um treinador de triathlon experiente e cuidadoso. Gere uma mensagem curta e motivacional em portugues brasileiro para o atleta baseado nos dados de performance, dados do relogio (HRV, sono, body battery, stress) e como ele esta se sentindo. Se houver relato de lesao ou dor alta, priorize recuperacao. Se HRV estiver abaixo da baseline ou body battery baixo, sugira treino mais leve. Responda em JSON: { "mentorMessage": "...", "recommendation": "..." }`,
      prompt: `Dados do atleta:
- CTL (fitness): ${currentCTL.toFixed(1)}
- ATL (fadiga): ${currentATL.toFixed(1)}
- TSB (forma): ${currentTSB.toFixed(1)} (tendencia: ${tsbTrend})
- Score de prontidao: ${score}/100
- Nivel recomendado: ${level}
- Qualidade do sono: ${sleepQuality ?? 'desconhecida'}
- Tendencia de carga: ${recentLoadTrend}${wellnessPrompt}${subjectivePrompt}

Gere uma mensagem de mentor (2-3 frases, motivacional e especifica) e uma recomendacao curta (1 frase sobre o tipo de treino ideal para hoje).${injuryContext ? ' IMPORTANTE: o atleta relatou lesao/dor — seja cauteloso e priorize recuperacao.' : ''}`,
    });
    mentorMessage = aiResponse.mentorMessage;
    recommendation = aiResponse.recommendation;
  } catch {
    // Use default messages on AI failure
  }

  return {
    level,
    score,
    factors: {
      tsb: currentTSB,
      tsbTrend,
      ctl: currentCTL,
      recentLoadTrend,
      sleepQuality,
      hrvStatus,
    },
    recommendation,
    mentorMessage,
  };
}

function getDefaultMentorMessage(level: string, tsb: number, ctl: number): string {
  if (level === 'intense') {
    return `Seu corpo esta descansado e pronto para desafios. Com TSB de ${tsb.toFixed(0)} e fitness de ${ctl.toFixed(0)}, hoje e dia de forcar o limite. Aproveite!`;
  }
  if (level === 'moderate') {
    return `Voce esta em boa forma para um treino moderado. Mantenha a consistencia e respeite os sinais do corpo.`;
  }
  if (level === 'light') {
    return `Seu corpo precisa de recuperacao. Um treino leve vai ajudar na circulacao sem comprometer a adaptacao.`;
  }
  return `Hoje e dia de descansar. A recuperacao e parte essencial do treinamento. Seu corpo vai agradecer amanha.`;
}

function getDefaultRecommendation(level: string): string {
  if (level === 'intense') return 'Treino de alta intensidade: intervalados, tempo runs ou simulados de prova.';
  if (level === 'moderate') return 'Treino moderado: endurance em Z2-Z3 com foco em tecnica.';
  if (level === 'light') return 'Treino leve: recuperacao ativa, yoga ou natacao leve.';
  return 'Descanso completo ou alongamento suave.';
}

// ── Race Prediction (IM 70.3) ────────────────────────────────────
//
// METODOLOGIA: Testes de fitness sao a BASE PRIMARIA da previsao.
// Atividades Strava e CTL CALIBRAM para cima ou para baixo.
//
// Base performance factor (% do teste usado na prova):
//   CTL < 30  → 70%  (baixo condicionamento, muita degradacao)
//   CTL 30-50 → 73%
//   CTL 50-70 → 76%
//   CTL 70-90 → 78%
//   CTL 90-100 → 79%
//   CTL > 100 → 80%
//   CTL > 120 → 82%
//
// Natacao: +8% sobre o fator base (degrada menos em distancia)
// Strava: calibra ±5% comparando pace real vs estimado

/**
 * Calcula o fator de performance baseado no CTL.
 * Quanto maior o CTL, mais proximo do resultado do teste o atleta performa.
 */
function getPerformanceFactor(ctl: number): number {
  if (ctl > 120) return 0.82;
  if (ctl > 100) return 0.80;
  if (ctl > 90) return 0.79;
  if (ctl > 70) return 0.78;
  if (ctl > 50) return 0.76;
  if (ctl > 30) return 0.73;
  return 0.70;
}

/**
 * Calibra o valor base com dados reais do Strava.
 * Se o atleta treina mais rapido do que o teste preve, ajusta para cima (max +5%).
 * Se treina mais devagar, ajusta para baixo (max -5%).
 */
function calibrateWithStrava(basePace: number, stravaPaces: number[]): number {
  if (stravaPaces.length < 2) return basePace; // Dados insuficientes, sem calibracao
  const stravaAvg = stravaPaces.reduce((a, b) => a + b, 0) / stravaPaces.length;
  const ratio = stravaAvg / basePace;
  // Clamp calibration to ±5%
  const clampedRatio = Math.max(0.95, Math.min(1.05, ratio));
  return basePace * clampedRatio;
}

function adjustBikeForElevation(baseSpeedKmh: number, elevationGainM: number, distanceM: number): number {
  if (!elevationGainM || elevationGainM <= 0) return baseSpeedKmh;
  const penaltyFactor = 1 + (elevationGainM / distanceM) * 8;
  return baseSpeedKmh / penaltyFactor;
}

function adjustRunForElevation(basePaceSecPerKm: number, elevationGainM: number): number {
  if (!elevationGainM || elevationGainM <= 0) return basePaceSecPerKm;
  const effectiveElevation = elevationGainM * 0.67;
  const adjustmentFactor = 1 + (effectiveElevation / 400);
  return basePaceSecPerKm * adjustmentFactor;
}

export async function predictRaceTime(
  userId: string,
  pmc: PMCData,
  bikeElevationGainM?: number | null,
  runElevationGainM?: number | null,
): Promise<RacePrediction | null> {
  const profile = await db.query.athleteProfiles.findFirst({
    where: eq(schema.athleteProfiles.userId, userId),
  });

  if (!profile) return null;

  // Fetch latest fitness tests
  const allTests = await db.query.fitnessTests.findMany({
    where: eq(schema.fitnessTests.userId, userId),
    orderBy: [desc(schema.fitnessTests.testDate)],
  });
  const swimTest = allTests.find((t) => t.testType === 'swim_t30');
  const bikeTest = allTests.find((t) => t.testType === 'bike_ftp20');
  const runTest = allTests.find((t) => t.testType === 'run_cooper12');

  const hasAnyTest = swimTest || bikeTest || runTest;
  if (!hasAnyTest && !profile.ftpWatts && !profile.run5kPaceSec) return null;

  // Performance factor based on CTL
  const baseFactor = getPerformanceFactor(pmc.currentCTL);
  const swimFactor = Math.min(0.95, baseFactor + 0.08); // Swim degrades less

  // Fetch Strava activities for calibration (180 days)
  const today = getTodayStr();
  const lookbackStart = dateAddDays(today, -180);
  const recentActivities = await db.query.activities.findMany({
    where: and(
      eq(schema.activities.userId, userId),
      gte(schema.activities.startedAt, new Date(lookbackStart + 'T00:00:00')),
    ),
    orderBy: [desc(schema.activities.startedAt)],
  });

  const swims = recentActivities.filter((a) => a.discipline === 'swim' && a.distanceM && a.durationSec);
  const bikes = recentActivities.filter((a) => a.discipline === 'bike' && a.distanceM && a.durationSec);
  const runs = recentActivities.filter((a) => a.discipline === 'run' && a.distanceM && a.durationSec);

  // IM 70.3 distances
  const SWIM_M = 1900;
  const BIKE_M = 90000;
  const RUN_M = 21100;

  // ═══ SWIM ═══
  // T30 test: distancia em 30min → pace/100m do teste
  // Race pace = testPace / swimFactor (dividido porque pace menor = mais rapido)
  let swimPace100m: number;
  if (swimTest?.distanceM) {
    const testPace = (30 * 60 / Number(swimTest.distanceM)) * 100; // pace/100m no teste
    swimPace100m = testPace / swimFactor; // Mais lento que o teste (ex: 88% → pace/0.88)
    // Calibrar com Strava
    const stravaPaces = swims.map((s) => (Number(s.durationSec!) / Number(s.distanceM!)) * 100);
    swimPace100m = calibrateWithStrava(swimPace100m, stravaPaces);
  } else if (swims.length > 0) {
    const paces = swims.map((s) => (Number(s.durationSec!) / Number(s.distanceM!)) * 100);
    swimPace100m = paces.reduce((a, b) => a + b, 0) / paces.length;
  } else {
    swimPace100m = profile.level === 'competitivo' ? 105 : profile.level === 'intermediario' ? 120 : 140;
  }
  const swimTimeSec = Math.round((SWIM_M / 100) * swimPace100m);

  // ═══ BIKE ═══
  // FTP test: potencia media 20min → FTP = 95% → race watts = FTP * baseFactor
  // Speed estimation from FTP-based race watts
  let bikeSpeedKmh: number;
  let bikePowerW: number | null = null;
  if (bikeTest?.avgPowerW) {
    const ftp = Math.round(bikeTest.avgPowerW * 0.95);
    const raceWatts = Math.round(ftp * baseFactor);
    bikePowerW = raceWatts;
    // Speed from power: rough model based on typical 70.3 conditions
    // ~28km/h at 200W, +0.05km/h per watt above 200
    bikeSpeedKmh = 28 + (raceWatts - 200) * 0.05;
    // Calibrate with Strava speeds
    const stravaSpeeds = bikes.map((b) => (Number(b.distanceM!) / 1000) / (Number(b.durationSec!) / 3600));
    if (stravaSpeeds.length >= 2) {
      const stravaAvg = stravaSpeeds.reduce((a, b) => a + b, 0) / stravaSpeeds.length;
      const ratio = stravaAvg / bikeSpeedKmh;
      bikeSpeedKmh *= Math.max(0.95, Math.min(1.05, ratio));
    }
  } else if (profile.ftpWatts) {
    const ftp = Number(profile.ftpWatts);
    const raceWatts = Math.round(ftp * baseFactor);
    bikePowerW = raceWatts;
    bikeSpeedKmh = 28 + (raceWatts - 200) * 0.05;
  } else if (bikes.length > 0) {
    const speeds = bikes.map((b) => (Number(b.distanceM!) / 1000) / (Number(b.durationSec!) / 3600));
    bikeSpeedKmh = speeds.reduce((a, b) => a + b, 0) / speeds.length * 0.95;
  } else {
    bikeSpeedKmh = profile.level === 'competitivo' ? 32 : profile.level === 'intermediario' ? 28 : 24;
  }

  const bikeSpeedAdjusted = adjustBikeForElevation(bikeSpeedKmh, bikeElevationGainM ?? 0, BIKE_M);
  const bikeTimeSec = Math.round((BIKE_M / 1000) / bikeSpeedAdjusted * 3600);

  // ═══ RUN ═══
  // Cooper test: distancia em 12min → pace/km do teste
  // Race half-marathon pace = testPace / baseFactor * brick factor
  let runPaceKm: number;
  if (runTest?.distanceM) {
    const testPaceKm = (12 * 60 / Number(runTest.distanceM)) * 1000; // pace/km no Cooper
    // Half marathon is much longer than 12min: apply base factor + 15% distance penalty + 8% brick
    runPaceKm = (testPaceKm / baseFactor) * 1.15 * 1.08;
    // Calibrate with Strava
    const stravaPaces = runs.map((r) => (Number(r.durationSec!) / Number(r.distanceM!)) * 1000);
    runPaceKm = calibrateWithStrava(runPaceKm, stravaPaces);
  } else if (profile.run5kPaceSec) {
    const pace5k = Number(profile.run5kPaceSec) / 5; // sec/km
    runPaceKm = (pace5k / baseFactor) * 1.15 * 1.08;
  } else if (runs.length > 0) {
    const paces = runs.map((r) => (Number(r.durationSec!) / Number(r.distanceM!)) * 1000);
    runPaceKm = paces.reduce((a, b) => a + b, 0) / paces.length * 1.08;
  } else {
    runPaceKm = profile.level === 'competitivo' ? 280 : profile.level === 'intermediario' ? 330 : 390;
  }

  const runPaceAdjusted = adjustRunForElevation(runPaceKm, runElevationGainM ?? 0);
  const runTimeSec = Math.round((RUN_M / 1000) * runPaceAdjusted);

  // ═══ TRANSITIONS ═══
  const t1Sec = 300;
  const t2Sec = 180;

  const totalTimeSec = swimTimeSec + bikeTimeSec + runTimeSec + t1Sec + t2Sec;

  // ═══ CONFIDENCE ═══
  let confidence = 20; // base
  // Tests are now primary — big confidence boost
  if (swimTest) confidence += 15;
  if (bikeTest) confidence += 15;
  if (runTest) confidence += 15;
  // Strava calibration bonus
  if (swims.length >= 3) confidence += 5;
  if (bikes.length >= 5) confidence += 5;
  if (runs.length >= 5) confidence += 5;
  // CTL reliability
  if (pmc.currentCTL > 80) confidence += 10;
  else if (pmc.currentCTL > 50) confidence += 5;
  // Elevation data
  if (bikeElevationGainM && bikeElevationGainM > 0) confidence += 3;
  if (runElevationGainM && runElevationGainM > 0) confidence += 2;
  confidence = Math.min(95, confidence);

  const fitnessLevel = Math.min(100, Math.round(pmc.currentCTL * 1.2));

  return {
    totalTimeSec,
    swimTimeSec,
    bikeTimeSec,
    runTimeSec,
    t1Sec,
    t2Sec,
    confidence,
    factors: {
      swimPace100m: Math.round(swimPace100m),
      bikePowerW,
      bikeSpeedKmh: Math.round(bikeSpeedAdjusted * 10) / 10,
      runPaceKm: Math.round(runPaceAdjusted),
      fitnessLevel,
      bikeElevationGainM: bikeElevationGainM ?? null,
      runElevationGainM: runElevationGainM ?? null,
    },
  };
}

// ── Target Race ──────────────────────────────────────────────────

export async function getTargetRace(userId: string, pmc: PMCData): Promise<TargetRace | null> {
  const raceGoal = await db.query.raceGoals.findFirst({
    where: and(
      eq(schema.raceGoals.userId, userId),
      eq(schema.raceGoals.active, true),
    ),
  });

  if (!raceGoal) return null;

  const daysRemaining = daysBetween(raceGoal.raceDate);

  // Get active plan
  const activePlan = await db.query.trainingPlans.findFirst({
    where: and(
      eq(schema.trainingPlans.userId, userId),
      eq(schema.trainingPlans.status, 'active'),
    ),
    orderBy: [desc(schema.trainingPlans.generatedAt)],
  });

  let planPhase: string | null = null;
  let planProgress: number | null = null;
  if (activePlan) {
    planPhase = activePlan.currentPhase;
    const start = new Date(activePlan.startDate + 'T00:00:00');
    const now = new Date(getTodayStr() + 'T00:00:00');
    const diffDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const weekNumber = Math.max(1, Math.floor(diffDays / 7) + 1);
    planProgress = Math.min(100, Math.round((weekNumber / (activePlan.totalWeeks ?? 1)) * 100));
  }

  // Race prediction
  let prediction: RacePrediction | null = null;
  if (raceGoal.distance === '70.3') {
    prediction = await predictRaceTime(
      userId,
      pmc,
      raceGoal.bikeElevationGainM ? Number(raceGoal.bikeElevationGainM) : null,
      raceGoal.runElevationGainM ? Number(raceGoal.runElevationGainM) : null,
    );
  }

  // Readiness score from PMC
  const readinessScore = Math.max(0, Math.min(100,
    Math.round(50 + pmc.currentTSB * 1.5 + (pmc.currentCTL > 40 ? 10 : 0)),
  ));

  return {
    id: raceGoal.id,
    raceName: raceGoal.raceName,
    distance: raceGoal.distance,
    raceDate: raceGoal.raceDate,
    targetTime: raceGoal.targetTime,
    daysRemaining,
    readinessScore,
    prediction,
    planPhase,
    planProgress,
  };
}

// ── Discipline Benchmarks (best test results) ───────────────────

interface DisciplineBenchmark {
  discipline: 'swim' | 'bike' | 'run';
  totalActivities: number;
  last30dActivities: number;
  bestPace: number | null;       // sec per 100m (swim) or sec per km (run)
  avgPace: number | null;
  bestSpeedKmh: number | null;   // bike
  avgSpeedKmh: number | null;    // bike
  bestPowerW: number | null;     // bike
  avgPowerW: number | null;      // bike
  bestHr: number | null;
  avgHr: number | null;
  longestDistanceM: number | null;
  longestDurationSec: number | null;
  totalDistanceM: number;
  totalDurationSec: number;
  recentTrend: 'improving' | 'declining' | 'stable';
}

export interface DisciplineBenchmarks {
  swim: DisciplineBenchmark;
  bike: DisciplineBenchmark;
  run: DisciplineBenchmark;
}

function computeBenchmark(
  activities: Array<{
    discipline: string;
    distanceM: string | null;
    durationSec: number | null;
    avgHr: number | null;
    avgPowerW: number | null;
    startedAt: Date;
  }>,
  discipline: 'swim' | 'bike' | 'run',
): DisciplineBenchmark {
  const all = activities.filter(
    (a) => a.discipline === discipline && a.distanceM && a.durationSec && Number(a.distanceM) > 0,
  );

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const last30d = all.filter((a) => a.startedAt >= thirtyDaysAgo);

  if (all.length === 0) {
    return {
      discipline,
      totalActivities: 0,
      last30dActivities: 0,
      bestPace: null,
      avgPace: null,
      bestSpeedKmh: null,
      avgSpeedKmh: null,
      bestPowerW: null,
      avgPowerW: null,
      bestHr: null,
      avgHr: null,
      longestDistanceM: null,
      longestDurationSec: null,
      totalDistanceM: 0,
      totalDurationSec: 0,
      recentTrend: 'stable',
    };
  }

  const totalDistanceM = all.reduce((s, a) => s + Number(a.distanceM!), 0);
  const totalDurationSec = all.reduce((s, a) => s + Number(a.durationSec!), 0);
  const longestDistanceM = Math.max(...all.map((a) => Number(a.distanceM!)));
  const longestDurationSec = Math.max(...all.map((a) => Number(a.durationSec!)));

  // Paces
  let bestPace: number | null = null;
  let avgPace: number | null = null;
  let bestSpeedKmh: number | null = null;
  let avgSpeedKmh: number | null = null;

  if (discipline === 'swim') {
    // Pace per 100m
    const paces = all.map((a) => (Number(a.durationSec!) / Number(a.distanceM!)) * 100);
    bestPace = Math.round(Math.min(...paces));
    avgPace = Math.round(paces.reduce((a, b) => a + b, 0) / paces.length);
  } else if (discipline === 'run') {
    // Pace per km
    const paces = all.map((a) => (Number(a.durationSec!) / Number(a.distanceM!)) * 1000);
    bestPace = Math.round(Math.min(...paces));
    avgPace = Math.round(paces.reduce((a, b) => a + b, 0) / paces.length);
  } else {
    // Bike: speed km/h
    const speeds = all.map((a) => (Number(a.distanceM!) / 1000) / (Number(a.durationSec!) / 3600));
    bestSpeedKmh = Math.round(Math.max(...speeds) * 10) / 10;
    avgSpeedKmh = Math.round((speeds.reduce((a, b) => a + b, 0) / speeds.length) * 10) / 10;
  }

  // Power (bike only)
  const withPower = all.filter((a) => a.avgPowerW);
  let bestPowerW: number | null = null;
  let avgPowerW: number | null = null;
  if (withPower.length > 0) {
    bestPowerW = Math.max(...withPower.map((a) => a.avgPowerW!));
    avgPowerW = Math.round(withPower.reduce((s, a) => s + a.avgPowerW!, 0) / withPower.length);
  }

  // HR
  const withHr = all.filter((a) => a.avgHr);
  let bestHr: number | null = null;
  let avgHr: number | null = null;
  if (withHr.length > 0) {
    bestHr = Math.min(...withHr.map((a) => a.avgHr!)); // lower avg HR = more efficient
    avgHr = Math.round(withHr.reduce((s, a) => s + a.avgHr!, 0) / withHr.length);
  }

  // Trend: compare avg pace/speed of last 30d vs previous 30d
  let recentTrend: 'improving' | 'declining' | 'stable' = 'stable';
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const prev30d = all.filter((a) => a.startedAt >= sixtyDaysAgo && a.startedAt < thirtyDaysAgo);

  if (last30d.length >= 2 && prev30d.length >= 2) {
    if (discipline === 'bike') {
      const recentSpeed = last30d.reduce((s, a) => s + (Number(a.distanceM!) / 1000) / (Number(a.durationSec!) / 3600), 0) / last30d.length;
      const prevSpeed = prev30d.reduce((s, a) => s + (Number(a.distanceM!) / 1000) / (Number(a.durationSec!) / 3600), 0) / prev30d.length;
      if (recentSpeed > prevSpeed * 1.02) recentTrend = 'improving';
      else if (recentSpeed < prevSpeed * 0.98) recentTrend = 'declining';
    } else {
      const recentPace = last30d.reduce((s, a) => s + Number(a.durationSec!) / Number(a.distanceM!), 0) / last30d.length;
      const prevPace = prev30d.reduce((s, a) => s + Number(a.durationSec!) / Number(a.distanceM!), 0) / prev30d.length;
      if (recentPace < prevPace * 0.98) recentTrend = 'improving';
      else if (recentPace > prevPace * 1.02) recentTrend = 'declining';
    }
  }

  return {
    discipline,
    totalActivities: all.length,
    last30dActivities: last30d.length,
    bestPace,
    avgPace,
    bestSpeedKmh,
    avgSpeedKmh,
    bestPowerW,
    avgPowerW,
    bestHr,
    avgHr,
    longestDistanceM,
    longestDurationSec,
    totalDistanceM: Math.round(totalDistanceM),
    totalDurationSec: Math.round(totalDurationSec),
    recentTrend,
  };
}

export async function getDisciplineBenchmarks(userId: string): Promise<DisciplineBenchmarks> {
  const lookbackStart = dateAddDays(getTodayStr(), -180);

  const activities = await db.query.activities.findMany({
    where: and(
      eq(schema.activities.userId, userId),
      gte(schema.activities.startedAt, new Date(lookbackStart + 'T00:00:00')),
    ),
    orderBy: [desc(schema.activities.startedAt)],
  });

  return {
    swim: computeBenchmark(activities, 'swim'),
    bike: computeBenchmark(activities, 'bike'),
    run: computeBenchmark(activities, 'run'),
  };
}

// ── Full Performance Dashboard ───────────────────────────────────

export async function getPerformanceDashboard(userId: string): Promise<{
  pmc: PMCData;
  readiness: ReadinessAssessment;
  targetRace: TargetRace | null;
  racePrediction: RacePrediction | null;
  benchmarks: DisciplineBenchmarks;
  weeklyTSS: number;
  monotony: number;
  strain: number;
}> {
  const pmc = await calculatePMC(userId, 90);
  const { weeklyTSS, monotony, strain } = calculateWeeklyLoadMetrics(pmc.metrics);

  const [readiness, targetRace, benchmarks] = await Promise.all([
    assessReadiness(userId, pmc),
    getTargetRace(userId, pmc),
    getDisciplineBenchmarks(userId),
  ]);

  return {
    pmc,
    readiness,
    targetRace,
    racePrediction: targetRace?.prediction ?? null,
    benchmarks,
    weeklyTSS,
    monotony,
    strain,
  };
}
