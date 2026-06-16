// DB-safe visual audit: fake auth token + mocked /api/** responses.
// Captures key screens at mobile widths to find cut/overflow/overlap issues.
import { chromium, devices } from '@playwright/test';
import fs from 'node:fs';

const BASE = process.env.AUDIT_BASE_URL ?? `http://localhost:${process.env.PORT ?? 3100}`;
const OUT = 'test-results/visual'; // relativo à raiz do repo (rodar: node tests/visual-audit.mjs)
fs.mkdirSync(OUT, { recursive: true });

const today = '2026-06-16';
function isoDay(offset = 0) {
  const d = new Date(2026, 5, 16 + offset);
  return d.toISOString().slice(0, 10);
}

// ---- Fixtures keyed by URL substring ----
const metrics = Array.from({ length: 42 }).map((_, i) => ({
  date: isoDay(-41 + i), tss: 40 + (i % 7) * 15, ctl: 50 + i * 0.5, atl: 45 + (i % 10),
  tsb: 5 - (i % 6), hrvMs: 60 + (i % 8), restingHr: 48 + (i % 4),
  fatigueScore: 30 + (i % 20), readinessScore: 70 + (i % 15), readinessLevel: 'moderate',
}));

const FIXTURES = [
  ['/api/dashboard/summary', { data: {
    raceGoal: { name: 'Ironman 70.3 Florianópolis', date: isoDay(60), daysRemaining: 60 },
    currentPlan: { phase: 'build', weekNumber: 7, percentComplete: 62 },
    currentWeek: { workoutsPlanned: 6, workoutsCompleted: 4, totalCalories: 4820, volumeHours: 9.3 },
    todayWorkout: { id: 'w1', discipline: 'bike', title: 'Bike Z2 endurance com blocos de força sub-limiar', durationMin: 95, distanceM: 45000, structure: { warmup: '15min Z1-Z2 progressivo', main: '4x (8min Z3 / 4min Z2) — cadência 85-95rpm', cooldown: '10min Z1 soltura' }, sentToWatch: false },
    todayActivity: null,
    todayProtocol: { id: 'p1', status: 'pending', items: [
      { phase: 'pre', minuteOffset: -30, productName: 'Gel Carb', brand: 'X', quantity: 1, unit: 'un', carbsG: 25, sodiumMg: 50, caffeineMg: 0, kcal: 100 },
      { phase: 'during', minuteOffset: 30, productName: 'Isotônico', brand: 'Y', quantity: 500, unit: 'ml', carbsG: 30, sodiumMg: 400, caffeineMg: 0, kcal: 120 },
    ], totalCarbsG: '85', totalSodiumMg: '900', totalCaffeineMg: '80', totalKcal: 420 },
    alerts: [ { type: 'recovery', level: 'warning', message: 'Sua carga subiu 35% esta semana — monitore a fadiga.' } ],
  } }],
  ['/api/performance/dashboard', { data: {
    pmc: { metrics, currentCTL: 72, currentATL: 65, currentTSB: 7 },
    readiness: { level: 'moderate', score: 78, factors: { tsb: 7, tsbTrend: 'rising', ctl: 72, recentLoadTrend: 'increasing', sleepQuality: 82, hrvStatus: 'normal' }, recommendation: 'Treino moderado recomendado hoje.', mentorMessage: 'Você está bem recuperado. Mantenha a consistência e foque na técnica no bloco principal.' },
    targetRace: { id: 'r1', raceName: 'Ironman 70.3 Florianópolis', distance: '70.3', raceDate: isoDay(60), targetTime: 18000, daysRemaining: 60, readinessScore: 78, prediction: null, planPhase: 'build', planProgress: 62 },
    racePrediction: { totalTimeSec: 18600, swimTimeSec: 2100, bikeTimeSec: 9600, runTimeSec: 6300, t1Sec: 300, t2Sec: 300, confidence: 0.72, factors: { swimPace100m: 105, bikePowerW: 210, bikeSpeedKmh: 33, runPaceKm: 300, fitnessLevel: 72 } },
    benchmarks: {
      swim: { discipline: 'swim', totalActivities: 40, last30dActivities: 8, bestPace: 95, avgPace: 110, bestSpeedKmh: null, avgSpeedKmh: null, bestPowerW: null, avgPowerW: null, bestHr: 165, avgHr: 150, longestDistanceM: 3800, longestDurationSec: 4200, totalDistanceM: 90000, totalDurationSec: 120000, recentTrend: 'improving' },
      bike: { discipline: 'bike', totalActivities: 60, last30dActivities: 12, bestPace: null, avgPace: null, bestSpeedKmh: 38, avgSpeedKmh: 31, bestPowerW: 280, avgPowerW: 200, bestHr: 172, avgHr: 145, longestDistanceM: 120000, longestDurationSec: 18000, totalDistanceM: 1500000, totalDurationSec: 300000, recentTrend: 'stable' },
      run: { discipline: 'run', totalActivities: 55, last30dActivities: 10, bestPace: 255, avgPace: 300, bestSpeedKmh: null, avgSpeedKmh: null, bestPowerW: null, avgPowerW: null, bestHr: 178, avgHr: 158, longestDistanceM: 21100, longestDurationSec: 7200, totalDistanceM: 600000, totalDurationSec: 200000, recentTrend: 'declining' },
    },
    weeklyTSS: 520, monotony: 1.4, strain: 728,
  } }],
  ['/api/plan/week/current', { weekNumber: 7, phase: 'build', startDate: isoDay(-2), endDate: isoDay(4), workouts: [
    { id: 'w1', discipline: 'bike', title: 'Bike Z2 endurance com blocos sub-limiar', scheduledDate: isoDay(0), durationMin: 95, distanceM: 45000, completed: false, sentToWatch: false },
    { id: 'w2', discipline: 'run', title: 'Corrida longa progressiva', scheduledDate: isoDay(1), durationMin: 75, distanceM: 14000, completed: false, sentToWatch: false },
    { id: 'w3', discipline: 'swim', title: 'Natação técnica + tiros', scheduledDate: isoDay(-1), durationMin: 60, distanceM: 2800, completed: true, sentToWatch: true },
  ] }],
  ['/api/plan/workout/', { data: {
    id: 'w1', discipline: 'bike', title: 'Bike Z2 endurance com blocos de força sub-limiar e cadência variável', description: 'Foco em base aeróbica e economia. Mantenha FC controlada nos blocos.', scheduledDate: isoDay(0), durationMin: 95, distanceM: 45000, intensityZone: 'Z2-Z3', tssEstimate: 88, structure: { warmup: '15min Z1-Z2 progressivo, finalizando com 3x30s de cadência alta (100+rpm)', main: '4x (8min Z3 @ 85-90% FTP / 4min Z2 recuperação). Cadência 85-95rpm. Mantenha postura aero nos intervalos fortes.', cooldown: '10min Z1 soltura, cadência livre' }, sentToWatch: false, sentAt: null, nutritionProtocol: { items: [
    { phase: 'pre', minuteOffset: -30, product: 'Gel de carboidrato', carbsG: 25, sodiumMg: 50, kcal: 100 },
    { phase: 'during', minuteOffset: 30, product: 'Isotônico 500ml', carbsG: 30, sodiumMg: 400, kcal: 120 },
    { phase: 'during', minuteOffset: 60, product: 'Gel com cafeína', carbsG: 25, sodiumMg: 50, caffeineMg: 50, kcal: 100 },
    { phase: 'post', minuteOffset: 100, product: 'Shake de recuperação', carbsG: 40, sodiumMg: 200, kcal: 280 },
  ], totalCarbsG: 120, totalSodiumMg: 700, totalCaffeineMg: 50, totalKcal: 600 } } }],
  ['/api/activities/', { data: {
    id: 'a1', title: 'Pedal longo na Estrada do Sol', discipline: 'bike', date: '2026-06-15T07:30:00.000Z', duration: '2h45', distance: '82.4km', avgHeartRate: 148,
    nutrition: [
      { id: 'n1', phase: 'pre', product: 'Banana + café', quantity: '1 unidade', carbsG: 27, sodiumMg: 1, minuteOffset: -20 },
      { id: 'n2', phase: 'during', product: 'Gel carb', quantity: '3 unidades', carbsG: 75, sodiumMg: 150, minuteOffset: 45 },
      { id: 'n3', phase: 'post', product: 'Shake recuperação', quantity: '1 dose', carbsG: 40, sodiumMg: 200, minuteOffset: 170 },
    ],
    totals: { carbsG: 142, sodiumMg: 351, caffeineMg: 80, kcal: 820 },
  } }],
  ['/api/activities?', { data: [
    { id: 'a1', title: 'Pedal longo na Estrada do Sol', discipline: 'bike', date: '2026-06-15T07:30:00.000Z', duration: '2h45', distance: '82.4km', hasNutrition: true },
    { id: 'a2', title: 'Corrida regenerativa', discipline: 'run', date: '2026-06-14T18:00:00.000Z', duration: '42min', distance: '7.1km', hasNutrition: false },
    { id: 'a3', title: 'Natação — série de tiros 100m', discipline: 'swim', date: '2026-06-13T06:30:00.000Z', duration: '58min', distance: '2.8km', hasNutrition: true },
  ], meta: { page: 1, limit: 20, total: 3, hasMore: false } }],
  ['/api/nutrition/presets', { data: [
    { id: 'pr1', name: 'Treino longo bike (>3h)', items: [ { product: 'Gel carb', quantity: '4 un', carbsG: 100, sodiumMg: 200 }, { product: 'Isotônico', quantity: '1L', carbsG: 60, sodiumMg: 800 } ] },
  ] }],
  ['/api/nutrition/shopping-list', { data: [ { product: 'Gel de carboidrato', totalQuantity: '12 un' }, { product: 'Isotônico em pó', totalQuantity: '2 potes' } ] }],
  ['/api/nutrition/log/', { data: { prescribed: { totalCarbsG: 120, totalSodiumMg: 700, totalCaffeineMg: 50, totalKcal: 600 }, actual: { totalCarbsG: 100, totalSodiumMg: 500, totalCaffeineMg: 50, totalKcal: 520, followedExactly: false }, metrics: { carbsPerHour: 60, sodiumPerHour: 300, prescribedCarbsPerHour: 72 }, status: { carbs: 'yellow', sodium: 'green', caffeine: 'green', kcal: 'yellow' }, protocolId: 'p1' } }],
  ['/api/integrations/strava/status', { data: { connected: true, lastSync: '2026-06-16T05:00:00.000Z', athleteName: 'Daniel' } }],
  ['/api/integrations/intervals/status', { data: { connected: false } }],
  ['/api/athlete/race-goal', { data: { raceName: 'Ironman 70.3 Florianópolis', raceDate: isoDay(60) } }],
];

function matchFixture(url) {
  for (const [key, body] of FIXTURES) {
    if (url.includes(key)) return body;
  }
  return null;
}

const shots = [];
async function shoot(page, name, width) {
  await page.setViewportSize({ width, height: 900 });
  await page.waitForTimeout(700);
  const file = `${OUT}/${name}-${width}.png`;
  await page.screenshot({ path: file, fullPage: true });
  shots.push(`${name}-${width}`);
  console.log('shot', file);
}

const run = async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['Pixel 5'] });

  // Mock all API calls
  await ctx.route('**/api/**', (route) => {
    const url = route.request().url();
    const fx = matchFixture(url);
    if (fx) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fx) });
    // generic safe fallbacks
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: null }) });
  });

  // Seed fake auth token (zustand persist shape)
  await ctx.addInitScript(() => {
    const fakeJwt = 'eyJhbGciOiJIUzI1NiJ9.' + btoa(JSON.stringify({ sub: 'u1', email: 'daniel@endura.app', name: 'Daniel Costa', role: 'athlete' })) + '.sig';
    localStorage.setItem('endura-auth', JSON.stringify({ state: { user: { id: 'u1', email: 'daniel@endura.app', name: 'Daniel Costa', role: 'athlete' }, token: fakeJwt, isAuthenticated: true }, version: 0 }));
  });

  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => consoleErrors.push('PAGEERROR: ' + e.message));

  const widths = [390, 320];

  // Public pages
  for (const w of widths) {
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
    await shoot(page, 'login', w);
  }

  // Onboarding (local state, click through steps)
  for (const w of widths) {
    await page.goto(`${BASE}/onboarding`, { waitUntil: 'networkidle' });
    await shoot(page, 'onboarding-step1', w);
    for (let s = 2; s <= 5; s++) {
      const btn = page.getByRole('button', { name: /Continuar/i });
      if (await btn.count()) { await btn.first().click(); await page.waitForTimeout(300); }
      await shoot(page, `onboarding-step${s}`, w);
    }
  }

  // Authed app screens
  const routes = [
    ['dashboard', `${BASE}/dashboard`],
    ['treino-list', `${BASE}/treino`],
    ['treino-detail', `${BASE}/treino/w1`],
    ['atividades', `${BASE}/atividades`],
    ['atividade-detail', `${BASE}/atividades/a1`],
    ['nutricao', `${BASE}/nutricao`],
    ['configuracoes', `${BASE}/configuracoes`],
  ];
  for (const [name, url] of routes) {
    for (const w of widths) {
      await page.goto(url, { waitUntil: 'networkidle' });
      await page.waitForTimeout(900);
      await shoot(page, name, w);
    }
  }

  // Dashboard performance tab
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  const perfTab = page.getByRole('tab', { name: /Performance/i });
  if (await perfTab.count()) { await perfTab.click(); await page.waitForTimeout(900); }
  await shoot(page, 'dashboard-performance', 390);

  fs.writeFileSync(`${OUT}/console-errors.json`, JSON.stringify(consoleErrors, null, 2));
  console.log('CONSOLE ERRORS:', consoleErrors.length);
  await browser.close();
};

run().then(() => { console.log('DONE', shots.length, 'shots'); process.exit(0); }).catch((e) => { console.error(e); process.exit(1); });
