// Verificação do motor de Teste Aero (aero-test.ts / virtual elevation).
// Monta rides sintéticos com CdA e Crr CONHECIDOS sobre um perfil de altitude
// definido, simulando a física pra frente, e afirma que o método RECUPERA os
// valores (global e por lap/posição). Puro em memória. NÃO toca no banco.
//   node_modules/.bin/tsx scripts/verify-aero-test.ts

import { runAeroTest, type AeroTestLapInput } from '../src/modules/activity/aero-test.js';
import { airDensity, type AeroStreams } from '../src/modules/activity/aero.js';

const G = 9.80665;
let failures = 0;
function check(name: string, cond: boolean, detail = '') {
  console.log(`  [${cond ? 'OK  ' : 'FAIL'}] ${name}${detail ? ' — ' + detail : ''}`);
  if (!cond) failures++;
}
function approx(a: number, b: number, tol: number) { return Math.abs(a - b) <= tol; }

// Gera um ride: perfil de altitude + velocidade definidos; potência calculada
// pra frente com o CdA/Crr verdadeiro de cada segmento (lap).
function buildTest(
  segs: { secs: number; cda: number; crr: number }[],
  mass: number,
  eff: number,
): { streams: AeroStreams; laps: AeroTestLapInput[] } {
  const total = segs.reduce((s, x) => s + x.secs, 0);
  const speed = new Array<number>(total);
  const altitude = new Array<number>(total);
  const temp = new Array<number>(total).fill(20);
  for (let i = 0; i < total; i++) {
    speed[i] = 11 + 1.8 * Math.sin((2 * Math.PI * i) / 220) + 0.6 * Math.sin((2 * Math.PI * i) / 90);
    altitude[i] = 120 + 5 * Math.sin((2 * Math.PI * i) / 300) + 2 * Math.sin((2 * Math.PI * i) / 137);
  }
  const power = new Array<number>(total).fill(0);
  const laps: AeroTestLapInput[] = [];
  let gi = 0;
  segs.forEach((seg, s) => {
    const start = gi;
    const end = gi + seg.secs - 1;
    for (let i = start; i <= end; i++) {
      const v = speed[i]!;
      const a = i > 0 ? v - speed[i - 1]! : 0;
      const dAlt = i > 0 ? altitude[i]! - altitude[i - 1]! : 0;
      const dd = v; // v*dt, dt=1
      const sinTheta = i > 0 && dd > 0 ? dAlt / dd : 0;
      const rho = airDensity(altitude[i], 20);
      const wheel = v * (0.5 * rho * seg.cda * v * v + seg.crr * mass * G + mass * G * sinTheta + mass * a);
      power[i] = wheel / eff;
    }
    laps.push({ lapIndex: s + 1, startSec: start, endSec: end });
    gi = end + 1;
  });
  const distance = new Array<number>(total);
  let d = 0;
  for (let i = 0; i < total; i++) { d += speed[i]!; distance[i] = d; }
  const streams: AeroStreams = {
    power, speed, altitude, temp, distance,
    grade: new Array<number>(total).fill(0),
    moving: new Array<number>(total).fill(1),
    hasPower: true, hasSpeed: true, hasAltitude: true, hasDistance: true,
    hasMoving: true, hasTemp: true, hasGrade: false,
  };
  return { streams, laps };
}

const EFF = 0.975;

// ── Teste 1: recuperação global de CdA + Crr (posição única, uniforme) ──
console.log('\n[1] Recuperação de CdA e Crr (uniforme, 2 laps iguais)');
{
  const mass = 78; // 70 atleta + 8 bike
  const { streams, laps } = buildTest(
    [{ secs: 300, cda: 0.28, crr: 0.005 }, { secs: 300, cda: 0.28, crr: 0.005 }],
    mass, EFF,
  );
  const r = runAeroTest(streams, laps, { weightKg: 70 }, { bikeWeightKg: 8, crr: 0.005, drivetrainEff: EFF });
  check('retornou resultado', r != null);
  if (r) {
    check(`Crr ≈ 0.005`, approx(r.crr, 0.005, 0.0008), `resolvido ${r.crr}`);
    check(`CdA global ≈ 0.28`, approx(r.overall.cdaM2, 0.28, 0.01), `${r.overall.cdaM2}`);
    check('RMSE do ajuste baixo (< 0.5m)', r.overall.fitRmseM < 0.5, `${r.overall.fitRmseM}m`);
    check('confiança alta', r.confidence.tier === 'high', `tier=${r.confidence.tier}`);
    check('CdA por lap ≈ 0.28', r.laps.every((l) => approx(l.cdaM2, 0.28, 0.012)),
      r.laps.map((l) => l.cdaM2).join(', '));
  }
}

// ── Teste 2: comparação de posições (CdAs diferentes, mesmo Crr) ──
console.log('\n[2] Comparação de posições — lap1 aero (0.24) vs lap2 alto (0.30)');
{
  const mass = 80;
  const { streams, laps } = buildTest(
    [{ secs: 300, cda: 0.24, crr: 0.005 }, { secs: 300, cda: 0.30, crr: 0.005 }],
    mass, EFF,
  );
  const r = runAeroTest(streams, laps, { weightKg: 72 }, { bikeWeightKg: 8, crr: 0.005, drivetrainEff: EFF });
  check('retornou 2 laps', r != null && r.laps.length === 2);
  if (r && r.laps.length === 2) {
    const l1 = r.laps[0]!, l2 = r.laps[1]!;
    check('lap1 (aero) tem CdA menor que lap2', l1.cdaM2 < l2.cdaM2, `${l1.cdaM2} < ${l2.cdaM2}`);
    check('separação de CdA ~0.06 (±0.02)', approx(l2.cdaM2 - l1.cdaM2, 0.06, 0.02), `Δ=${round(l2.cdaM2 - l1.cdaM2)}`);
    check('melhor posição = lap1', r.bestLapIndex === 1, `bestLapIndex=${r.bestLapIndex}`);
    check('lap1 Δwatts = 0 (é a melhor)', l1.deltaWattsVsBest === 0);
    check('lap2 Δwatts > 0 (custa mais)', l2.deltaWattsVsBest > 0, `+${l2.deltaWattsVsBest}W`);
  }
}

// ── Teste 3: sem altitude → null (método precisa da altitude) ──
console.log('\n[3] Sem stream de altitude → null');
{
  const mass = 78;
  const { streams, laps } = buildTest([{ secs: 300, cda: 0.28, crr: 0.005 }], mass, EFF);
  const noAlt: AeroStreams = { ...streams, hasAltitude: false };
  const r = runAeroTest(noAlt, laps, { weightKg: 70 }, { bikeWeightKg: 8, crr: null, drivetrainEff: EFF });
  check('retornou null', r === null);
}

// ── Teste 4: Crr diferente do verdadeiro também é recuperado ──
console.log('\n[4] Recupera Crr alto (0.009, pneu de treino)');
{
  const mass = 78;
  const { streams, laps } = buildTest(
    [{ secs: 300, cda: 0.30, crr: 0.009 }, { secs: 300, cda: 0.30, crr: 0.009 }],
    mass, EFF,
  );
  const r = runAeroTest(streams, laps, { weightKg: 70 }, { bikeWeightKg: 8, crr: 0.005, drivetrainEff: EFF });
  check('retornou resultado', r != null);
  if (r) {
    check('Crr ≈ 0.009', approx(r.crr, 0.009, 0.0008), `resolvido ${r.crr}`);
    check('CdA global ≈ 0.30', approx(r.overall.cdaM2, 0.30, 0.012), `${r.overall.cdaM2}`);
  }
}

function round(n: number) { return Math.round(n * 1000) / 1000; }

console.log(`\n${failures === 0 ? '✓ TODOS OS TESTES PASSARAM' : `✗ ${failures} verificação(ões) falharam`}`);
process.exit(failures === 0 ? 0 : 1);
