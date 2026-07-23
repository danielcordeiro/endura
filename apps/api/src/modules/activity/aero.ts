// ── Estimativa passiva de CdA a partir dos dados da pedalada ──────
//
// Inverte o balanço de potência do ciclismo pra estimar o coeficiente de
// arrasto aerodinâmico (CdA, em m²) usando só power/velocidade/altitude/temp
// que o Endura já ingere do Strava — sem túnel de vento e sem scan.
//
// Método (abordagem A do design 2026-07-23, estilo Best Bike Split):
// com o Crr FIXO (vindo do setup de pneu/piso no perfil), a única incógnita
// vira o CdA, e ele é resolvido por regressão linear pela origem sobre todas
// as amostras "aero-válidas" da pedalada de uma vez.
//
//   P_roda = ½·ρ·CdA·v³ + v·(Crr·m·g·cosθ + m·g·sinθ + m·a)
//   Y = P_roda − v·(F_rol + F_grav + F_acel)     [tudo conhecido]
//   X = ½·ρ·v³                                    →  Y = CdA·X
//   CdA = Σ(X·Y) / Σ(X²)     (mínimos quadrados pela origem)
//
// A ponderação natural em v³ dá mais voz às amostras rápidas, onde o aero
// domina e o ruído de rolamento/gravidade pesa menos. Um passe robusto
// (trim por desvio) remove rajada/buraco/spike de GPS. Vento é assumido
// calmo na Fase 1 — daí a penalidade de confiança.
//
// Módulo PURO (sem I/O), no mesmo padrão testável de activity-analytics.ts.

// ── Constantes físicas ────────────────────────────────────────────

const G = 9.80665;             // m/s²
const P0_PA = 101325;          // pressão padrão ao nível do mar (Pa)
const T0_K = 288.15;           // temperatura padrão ISA (K)
const LAPSE = 0.0065;          // gradiente térmico ISA (K/m)
const ISA_EXP = 5.255;         // expoente barométrico g·M/(R·L)
const R_AIR = 287.05;          // constante do ar seco (J/kg·K)
const RHO_REF = 1.225;         // ρ de referência (nível do mar, 15 °C) p/ tradução em W

// ── Defaults quando o setup do perfil está incompleto ────────────

const DEFAULT_BIKE_KG = 8.0;
const DEFAULT_CRR = 0.005;      // pneu de estrada de treino em asfalto
const DEFAULT_DRIVETRAIN_EFF = 0.975;
const DEFAULT_RIDER_KG = 75;

// ── Limiares da máscara aero-válida ──────────────────────────────

const V_MIN_MS = 5.0;           // ~18 km/h — abaixo disso o aero some e X~0 fica instável
const A_MAX_MS2 = 0.5;          // descarta acel/freada forte (força desconhecida na freada)
const GRADE_MAX = 0.08;         // 8% — evita amplificar erro de elevação em rampa
const MIN_USABLE_SECS = 120;    // menos que isso não dá pra estimar com sentido
const CDA_MIN = 0.15;           // fora dessa faixa física → resultado inválido
const CDA_MAX = 0.60;

// Velocidade de referência da tradução tangível (40 km/h).
const V_40KMH_MS = 40 / 3.6;

// ── Tipos ─────────────────────────────────────────────────────────

/** Setup físico do sistema (bike + pneu + transmissão), vindo do perfil. */
export interface AeroSetup {
  bikeWeightKg: number | null;
  crr: number | null;
  drivetrainEff: number | null;
}

/** Contexto do atleta necessário pro cálculo (subconjunto de AthleteContext). */
export interface AeroAthlete {
  weightKg?: number | null;
}

/**
 * Streams reamostradas a 1Hz de que o cálculo precisa. É um subconjunto
 * estrutural de ResampledStreams (activity-analytics.ts) — passar o objeto
 * inteiro é compatível.
 */
export interface AeroStreams {
  power: number[];
  speed: number[];
  altitude: number[];
  grade: number[];
  temp: number[];
  distance: number[];
  moving: number[];
  hasPower: boolean;
  hasSpeed: boolean;
  hasAltitude: boolean;
  hasGrade: boolean;
  hasTemp: boolean;
  hasMoving: boolean;
  hasDistance: boolean;
}

export type AeroConfidenceTier = 'low' | 'medium' | 'high';

export interface AeroResult {
  version: 1;
  cdaM2: number;                 // CdA estimado (m²)
  wattsAt40kmh: number;          // arrasto aerodinâmico a 40 km/h (ρ ref) — tradução tangível
  crr: number;                   // Crr fixo usado
  bikeWeightKg: number;          // massa da bike usada
  riderWeightKg: number | null;  // peso do atleta (perfil) usado
  systemMassKg: number;          // massa total na física
  drivetrainEff: number;         // η usado
  airDensityKgM3: number;        // ρ média das amostras válidas
  sampleSecs: number;            // segundos aero-válidos usados na regressão
  usableFraction: number;        // fração da pedalada em movimento que foi usável
  speed: { minMs: number; maxMs: number; avgMs: number }; // faixa de velocidade usável
  usedDefaults: boolean;         // caiu em setup default (perfil incompleto)
  confidence: {
    tier: AeroConfidenceTier;
    score: number;               // 0..1
    reasons: string[];           // fatores limitantes / avisos p/ exibir
  };
}

// ── Utilitários ───────────────────────────────────────────────────

function isNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function round(n: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

function clamp01(n: number): number {
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

/** Densidade do ar por amostra: altitude (ISA) + temperatura da stream. */
export function airDensity(altM: number | null | undefined, tempC: number | null | undefined): number {
  const h = isNum(altM) ? altM : 0;
  const t = isNum(tempC) ? tempC : 15;
  const p = P0_PA * Math.pow(Math.max(0, 1 - (LAPSE * h) / T0_K), ISA_EXP);
  return p / (R_AIR * (t + 273.15));
}

/**
 * Aceleração por segundo a partir da velocidade (1Hz), por diferença central
 * suavizada (janela 3) — a velocity_smooth do Strava já vem filtrada, mas o
 * diff bruto ainda oscila.
 */
function computeAccel(speed: number[]): number[] {
  const n = speed.length;
  const raw = new Array<number>(n).fill(0);
  for (let i = 1; i < n - 1; i++) {
    raw[i] = (speed[i + 1]! - speed[i - 1]!) / 2; // dt = 1s
  }
  if (n >= 2) {
    raw[0] = speed[1]! - speed[0]!;
    raw[n - 1] = speed[n - 1]! - speed[n - 2]!;
  }
  const out = new Array<number>(n).fill(0);
  for (let i = 0; i < n; i++) {
    const lo = Math.max(0, i - 1);
    const hi = Math.min(n - 1, i + 1);
    let s = 0;
    for (let j = lo; j <= hi; j++) s += raw[j]!;
    out[i] = s / (hi - lo + 1);
  }
  return out;
}

/**
 * Inclinação (rise/run) por segundo. Prefere a stream grade_smooth do Strava
 * (em %); sem ela, deriva de d(altitude)/d(distância) numa janela de ±3s pra
 * amortecer o ruído.
 */
function computeSlope(s: AeroStreams): number[] {
  const n = s.speed.length;
  const out = new Array<number>(n).fill(0);
  if (s.hasGrade) {
    for (let i = 0; i < n; i++) {
      const g = s.grade[i];
      out[i] = isNum(g) ? g / 100 : 0;
    }
    return out;
  }
  if (!s.hasAltitude || !s.hasDistance) return out;
  const win = 3;
  for (let i = 0; i < n; i++) {
    const lo = Math.max(0, i - win);
    const hi = Math.min(n - 1, i + win);
    const dAlt = (s.altitude[hi] ?? 0) - (s.altitude[lo] ?? 0);
    const dDist = (s.distance[hi] ?? 0) - (s.distance[lo] ?? 0);
    out[i] = dDist > 1 ? dAlt / dDist : 0;
  }
  return out;
}

// ── Núcleo: estimativa de CdA ─────────────────────────────────────

interface Sample {
  x: number;   // ½·ρ·v³
  y: number;   // P_roda − v·(F_rol + F_grav + F_acel)
  v: number;   // velocidade (m/s)
  rho: number; // densidade do ar
}

function solveThroughOrigin(samples: Sample[]): number {
  let sxy = 0;
  let sxx = 0;
  for (const s of samples) {
    sxy += s.x * s.y;
    sxx += s.x * s.x;
  }
  return sxx > 0 ? sxy / sxx : NaN;
}

export function estimateAero(
  streams: AeroStreams,
  athlete: AeroAthlete,
  setup: AeroSetup,
): AeroResult | null {
  // Precisa de potência e velocidade — sem isso não há física de arrasto.
  if (!streams.hasPower || !streams.hasSpeed) return null;

  const riderWeightKg = isNum(athlete.weightKg) ? athlete.weightKg : null;
  const bikeWeightKg = isNum(setup.bikeWeightKg) ? setup.bikeWeightKg : DEFAULT_BIKE_KG;
  const crr = isNum(setup.crr) && setup.crr > 0 ? setup.crr : DEFAULT_CRR;
  const eff = isNum(setup.drivetrainEff) && setup.drivetrainEff > 0 ? setup.drivetrainEff : DEFAULT_DRIVETRAIN_EFF;
  const usedDefaults =
    !isNum(setup.bikeWeightKg) || !(isNum(setup.crr) && setup.crr > 0) || riderWeightKg === null;

  const mass = (riderWeightKg ?? DEFAULT_RIDER_KG) + bikeWeightKg;

  const accel = computeAccel(streams.speed);
  const slope = computeSlope(streams);
  const n = streams.speed.length;

  let movingSecs = 0;
  const samples: Sample[] = [];

  for (let i = 0; i < n; i++) {
    const moving = streams.hasMoving ? streams.moving[i]! > 0.5 : true;
    if (moving) movingSecs++;

    const v = streams.speed[i];
    const p = streams.power[i];
    if (!moving || !isNum(v) || !isNum(p) || v < V_MIN_MS || p < 0) continue;

    const a = accel[i]!;
    if (Math.abs(a) > A_MAX_MS2) continue; // acel/freada forte

    const grade = slope[i]!;
    if (Math.abs(grade) > GRADE_MAX) continue; // rampa forte amplifica erro

    const cosT = 1 / Math.sqrt(1 + grade * grade);
    const sinT = grade * cosT;
    const rho = airDensity(streams.altitude[i], streams.temp[i]);

    const pWheel = p * eff;
    const fRoll = crr * mass * G * cosT;
    const fGrav = mass * G * sinT;
    const fAccel = mass * a;

    const y = pWheel - v * (fRoll + fGrav + fAccel);
    const x = 0.5 * rho * v * v * v;

    samples.push({ x, y, v, rho });
  }

  if (samples.length < MIN_USABLE_SECS) return null;

  // 1ª passada + 2 passes robustos (trim das amostras com resíduo > 2.5σ).
  let used = samples;
  let cda = solveThroughOrigin(used);
  for (let pass = 0; pass < 2; pass++) {
    if (!Number.isFinite(cda)) break;
    let sumSq = 0;
    for (const s of used) {
      const r = s.y - cda * s.x;
      sumSq += r * r;
    }
    const sigma = Math.sqrt(sumSq / used.length);
    if (sigma === 0) break;
    const trimmed = used.filter((s) => Math.abs(s.y - cda * s.x) <= 2.5 * sigma);
    if (trimmed.length < MIN_USABLE_SECS || trimmed.length === used.length) break;
    used = trimmed;
    cda = solveThroughOrigin(used);
  }

  if (!Number.isFinite(cda) || cda < CDA_MIN || cda > CDA_MAX) return null;

  // Estatísticas do conjunto usado.
  let vMin = Infinity;
  let vMax = -Infinity;
  let vSum = 0;
  let rhoSum = 0;
  let ySum = 0;
  let resSq = 0;
  let highSpeed = 0;
  for (const s of used) {
    if (s.v < vMin) vMin = s.v;
    if (s.v > vMax) vMax = s.v;
    vSum += s.v;
    rhoSum += s.rho;
    ySum += Math.abs(s.y);
    const r = s.y - cda * s.x;
    resSq += r * r;
    if (s.v >= 8) highSpeed++; // ~29 km/h+ : onde o sinal aero é forte
  }
  const sampleSecs = used.length;
  const avgRho = rhoSum / sampleSecs;
  const usableFraction = movingSecs > 0 ? sampleSecs / movingSecs : 0;
  const highSpeedFraction = highSpeed / sampleSecs;
  const rmsResid = Math.sqrt(resSq / sampleSecs);
  const meanY = ySum / sampleSecs;
  const normResid = meanY > 0 ? rmsResid / meanY : 1;

  // ── Confiança ──
  const covScore = clamp01(sampleSecs / 600);          // 10 min limpos = cheio
  const fracScore = clamp01(usableFraction / 0.5);     // 50% da pedalada usável = cheio
  const speedScore = clamp01(highSpeedFraction / 0.3); // 30% em alta velocidade = cheio
  const fitScore = clamp01(1 - normResid / 0.6);       // resíduo baixo = cheio
  let score = 0.3 * covScore + 0.2 * fracScore + 0.2 * speedScore + 0.3 * fitScore;
  score = clamp01(score * 0.9); // penalidade de vento não verificado (Fase 1)

  const reasons: string[] = [];
  reasons.push('vento assumido calmo (não verificado)');
  if (usedDefaults) reasons.push('setup padrão — informe peso da bike e pneu no perfil');
  if (sampleSecs < 300) reasons.push('pouco trecho aero-válido (plano/estável)');
  if (highSpeedFraction < 0.15) reasons.push('pouca velocidade alta');
  if (normResid > 0.4) reasons.push('sinal ruidoso (terreno/pedalada irregular)');

  // Tier: "alta" exige bastante dado limpo, rápido e bem ajustado — proxy de
  // dia calmo, já que vento não é medido.
  let tier: AeroConfidenceTier;
  if (score >= 0.72 && sampleSecs >= 300 && usableFraction >= 0.3 && highSpeedFraction >= 0.15) {
    tier = 'high';
  } else if (score >= 0.45 && sampleSecs >= MIN_USABLE_SECS) {
    tier = 'medium';
  } else {
    tier = 'low';
  }

  // Tradução tangível: arrasto aerodinâmico a 40 km/h em ρ de referência.
  const wattsAt40kmh = 0.5 * RHO_REF * cda * V_40KMH_MS ** 3;

  return {
    version: 1,
    cdaM2: round(cda, 3),
    wattsAt40kmh: round(wattsAt40kmh, 0),
    crr: round(crr, 4),
    bikeWeightKg: round(bikeWeightKg, 1),
    riderWeightKg,
    systemMassKg: round(mass, 1),
    drivetrainEff: round(eff, 3),
    airDensityKgM3: round(avgRho, 3),
    sampleSecs,
    usableFraction: round(usableFraction, 3),
    speed: { minMs: round(vMin, 2), maxMs: round(vMax, 2), avgMs: round(vSum / sampleSecs, 2) },
    usedDefaults,
    confidence: { tier, score: round(score, 2), reasons },
  };
}
