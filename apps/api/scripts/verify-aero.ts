// Verificação do motor de estimativa de CdA (aero.ts) — round-trip sintético.
//
// Monta pedaladas artificiais com CdA/Crr/massa CONHECIDOS (simulando a física
// pra frente), roda estimateAero e afirma que ele RECUPERA o CdA de volta.
// Também testa exclusão de freada, densidade do ar e os tiers de confiança.
//
// Puro em memória, NÃO toca no banco. Uso:
//   pnpm exec tsx scripts/verify-aero.ts
// (ou: node_modules/.bin/tsx scripts/verify-aero.ts)

import { estimateAero, airDensity, type AeroStreams, type AeroSetup } from '../src/modules/activity/aero.js';

const G = 9.80665;

let failures = 0;
function check(name: string, cond: boolean, detail = '') {
  const tag = cond ? 'OK  ' : 'FAIL';
  if (!cond) failures++;
  console.log(`  [${tag}] ${name}${detail ? ' — ' + detail : ''}`);
}
function approx(a: number, b: number, tol: number): boolean {
  return Math.abs(a - b) <= tol;
}

// ── Simulador da física pra frente ────────────────────────────────
// Dado o perfil de velocidade/grade e os parâmetros verdadeiros, devolve a
// potência MEDIDA (no pedivela) que produziria exatamente esse movimento.

interface TrueParams {
  cda: number;
  crr: number;
  riderKg: number;
  bikeKg: number;
  eff: number;
  altM: number;
  tempC: number;
}

function buildRide(
  speed: number[],
  grade: number[],
  power0: number[] | null, // se fornecido, sobrescreve a potência (ex.: freada = 0)
  tp: TrueParams,
): AeroStreams {
  const n = speed.length;
  const mass = tp.riderKg + tp.bikeKg;
  const rho = airDensity(tp.altM, tp.tempC);

  // aceleração "verdadeira" pela mesma diferença central que o motor usa
  const accel = new Array<number>(n).fill(0);
  for (let i = 1; i < n - 1; i++) accel[i] = (speed[i + 1]! - speed[i - 1]!) / 2;
  if (n >= 2) { accel[0] = speed[1]! - speed[0]!; accel[n - 1] = speed[n - 1]! - speed[n - 2]!; }

  const power: number[] = [];
  const distance: number[] = [];
  let dist = 0;
  for (let i = 0; i < n; i++) {
    const v = speed[i]!;
    const g = grade[i]!;
    const cosT = 1 / Math.sqrt(1 + g * g);
    const sinT = g * cosT;
    const wheel =
      0.5 * rho * tp.cda * v * v * v +
      tp.crr * mass * G * cosT * v +
      mass * G * sinT * v +
      mass * accel[i]! * v;
    power.push(power0 ? power0[i]! : wheel / tp.eff);
    dist += v;
    distance.push(dist);
  }

  return {
    power,
    speed,
    altitude: new Array<number>(n).fill(tp.altM),
    grade,
    temp: new Array<number>(n).fill(tp.tempC),
    distance,
    moving: new Array<number>(n).fill(1),
    hasPower: true, hasSpeed: true, hasAltitude: true, hasGrade: true,
    hasTemp: true, hasMoving: true, hasDistance: true,
  };
}

function setup(tp: TrueParams): AeroSetup {
  return { bikeWeightKg: tp.bikeKg, crr: tp.crr, drivetrainEff: tp.eff };
}

// ── Teste 1: recuperação exata (plano, ar parado, velocidade constante) ──
console.log('\n[1] Recuperação exata — plano, ar parado, v constante');
{
  const tp: TrueParams = { cda: 0.28, crr: 0.004, riderKg: 70, bikeKg: 8, eff: 0.975, altM: 100, tempC: 20 };
  const n = 1200;
  const speed = new Array<number>(n).fill(11);
  const grade = new Array<number>(n).fill(0);
  const ride = buildRide(speed, grade, null, tp);
  const r = estimateAero(ride, { weightKg: tp.riderKg }, setup(tp));
  check('retornou resultado', r != null);
  if (r) {
    check(`CdA ≈ ${tp.cda}`, approx(r.cdaM2, tp.cda, 0.005), `estimado ${r.cdaM2}`);
    check('confiança alta', r.confidence.tier === 'high', `tier=${r.confidence.tier} score=${r.confidence.score}`);
    check('não usou defaults', r.usedDefaults === false);
    check('wattsAt40kmh plausível (200-280W)', r.wattsAt40kmh > 200 && r.wattsAt40kmh < 280, `${r.wattsAt40kmh}W`);
  }
}

// ── Teste 2: ride realista (velocidade + grade variando, ruído na potência) ──
console.log('\n[2] Ride realista — velocidade/grade variando + ruído de potência');
{
  const tp: TrueParams = { cda: 0.31, crr: 0.005, riderKg: 72, bikeKg: 8.5, eff: 0.975, altM: 300, tempC: 18 };
  const n = 1800;
  const speed: number[] = [];
  const grade: number[] = [];
  for (let t = 0; t < n; t++) {
    speed.push(10 + 2.5 * Math.sin((2 * Math.PI * t) / 240));
    grade.push(0.02 * Math.sin((2 * Math.PI * t) / 180)); // ±2%
  }
  const ride = buildRide(speed, grade, null, tp);
  // ruído ±3% na potência medida (imita variação real do medidor)
  ride.power = ride.power.map((p) => p * (1 + (Math.random() - 0.5) * 0.06));
  const r = estimateAero(ride, { weightKg: tp.riderKg }, setup(tp));
  check('retornou resultado', r != null);
  if (r) {
    const relErr = Math.abs(r.cdaM2 - tp.cda) / tp.cda;
    check(`CdA ≈ ${tp.cda} (±10%)`, relErr < 0.1, `estimado ${r.cdaM2} (erro ${(relErr * 100).toFixed(1)}%)`);
    check('densidade do ar ~1.15-1.22', r.airDensityKgM3 > 1.14 && r.airDensityKgM3 < 1.23, `${r.airDensityKgM3}`);
  }
}

// ── Teste 3: freada não corrompe (deve ser filtrada) ──
console.log('\n[3] Freada forte no meio — deve ser filtrada, CdA estável');
{
  const tp: TrueParams = { cda: 0.28, crr: 0.004, riderKg: 70, bikeKg: 8, eff: 0.975, altM: 100, tempC: 20 };
  const n = 1200;
  const speed: number[] = [];
  const grade = new Array<number>(n).fill(0);
  for (let t = 0; t < n; t++) speed.push(11);
  // Janela 600-610: freada dura 12 -> 5 m/s (a ~ -0.6, |a|>0.5) com potência 0.
  for (let t = 600; t <= 610; t++) speed[t] = 12 - (12 - 5) * ((t - 600) / 10);
  const power0 = new Array<number>(n).fill(NaN); // NaN = usar física; sobrescreve só a freada
  const ride = buildRide(speed, grade, null, tp);
  for (let t = 600; t <= 610; t++) ride.power[t] = 0; // freada: sem potência
  void power0;
  const r = estimateAero(ride, { weightKg: tp.riderKg }, setup(tp));
  check('retornou resultado', r != null);
  if (r) {
    check(`CdA ainda ≈ ${tp.cda} (±5%)`, approx(r.cdaM2, tp.cda, 0.014), `estimado ${r.cdaM2}`);
  }
}

// ── Teste 4: densidade do ar (ISA) ──
console.log('\n[4] Densidade do ar (ISA)');
{
  const seaLevel = airDensity(0, 15);
  const highAlt = airDensity(2000, 15);
  const hot = airDensity(0, 35);
  check('nível do mar 15°C ≈ 1.225', approx(seaLevel, 1.225, 0.01), `${seaLevel.toFixed(3)}`);
  check('altitude reduz densidade', highAlt < seaLevel, `${highAlt.toFixed(3)} < ${seaLevel.toFixed(3)}`);
  check('calor reduz densidade', hot < seaLevel, `${hot.toFixed(3)} < ${seaLevel.toFixed(3)}`);
}

// ── Teste 5: setup ausente → usedDefaults + confiança rebaixada ──
console.log('\n[5] Setup ausente → cai em defaults e sinaliza');
{
  const tp: TrueParams = { cda: 0.28, crr: 0.005, riderKg: 75, bikeKg: 8, eff: 0.975, altM: 100, tempC: 20 };
  const n = 800;
  const ride = buildRide(new Array<number>(n).fill(11), new Array<number>(n).fill(0), null, tp);
  const r = estimateAero(ride, { weightKg: null }, { bikeWeightKg: null, crr: null, drivetrainEff: null });
  check('retornou resultado (com defaults)', r != null);
  if (r) {
    check('usedDefaults = true', r.usedDefaults === true);
    check('motivo de setup padrão presente', r.confidence.reasons.some((x) => x.includes('setup padrão')));
    check('motivo de vento presente', r.confidence.reasons.some((x) => x.includes('vento')));
  }
}

// ── Teste 6: ride curto/em rampa → sem estimativa (null) ──
console.log('\n[6] Ride só de subida forte → sem estimativa');
{
  const tp: TrueParams = { cda: 0.28, crr: 0.005, riderKg: 70, bikeKg: 8, eff: 0.975, altM: 500, tempC: 15 };
  const n = 600;
  const ride = buildRide(new Array<number>(n).fill(6), new Array<number>(n).fill(0.12), null, tp); // 12% > GRADE_MAX
  const r = estimateAero(ride, { weightKg: tp.riderKg }, setup(tp));
  check('retornou null (sem trecho aero-válido)', r === null);
}

console.log(`\n${failures === 0 ? '✓ TODOS OS TESTES PASSARAM' : `✗ ${failures} verificação(ões) falharam`}`);
process.exit(failures === 0 ? 0 : 1);
