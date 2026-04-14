import { eq, and, desc } from 'drizzle-orm';
import { db } from '../../lib/db.js';
import * as schema from '../../../drizzle/schema.js';

// ── Types ─────────────────────────────────────────────────────────

export type TestType = 'swim_t30' | 'bike_ftp20' | 'run_cooper12';

interface CreateTestInput {
  testType: TestType;
  testDate: string;
  distanceM?: number | null;
  durationSec?: number | null;
  avgPowerW?: number | null;
  avgHr?: number | null;
  notes?: string | null;
}

interface FitnessTestResult {
  id: string;
  testType: TestType;
  testDate: string;
  distanceM: number | null;
  durationSec: number | null;
  avgPowerW: number | null;
  avgHr: number | null;
  derivedPace: number | null;
  derivedFtp: number | null;
  derivedVo2max: number | null;
  notes: string | null;
  createdAt: Date | null;
}

// ── Derived calculations ──────────────────────────────────────────

function deriveSwimT30(distanceM: number): { pace: number } {
  // T30: distance swum in 30 minutes → pace per 100m
  const pace = (30 * 60 / distanceM) * 100;
  return { pace: Math.round(pace * 100) / 100 };
}

function deriveBikeFtp20(avgPowerW: number): { ftp: number } {
  // FTP = 95% of 20-min avg power
  return { ftp: Math.round(avgPowerW * 0.95) };
}

function deriveCooper12(distanceM: number): { vo2max: number; paceKm: number } {
  // VO2max = (distance_m - 504.9) / 44.73
  const vo2max = Math.round(((distanceM - 504.9) / 44.73) * 10) / 10;
  // Estimated 5k pace from Cooper: pace/km = 720 / (distanceM / 1000)
  const paceKm = Math.round((12 * 60) / (distanceM / 1000));
  return { vo2max, paceKm };
}

// ── CRUD ──────────────────────────────────────────────────────────

export async function createTest(userId: string, input: CreateTestInput): Promise<FitnessTestResult> {
  let derivedPace: number | null = null;
  let derivedFtp: number | null = null;
  let derivedVo2max: number | null = null;

  if (input.testType === 'swim_t30' && input.distanceM) {
    const result = deriveSwimT30(input.distanceM);
    derivedPace = result.pace;
  } else if (input.testType === 'bike_ftp20' && input.avgPowerW) {
    const result = deriveBikeFtp20(input.avgPowerW);
    derivedFtp = result.ftp;
  } else if (input.testType === 'run_cooper12' && input.distanceM) {
    const result = deriveCooper12(input.distanceM);
    derivedVo2max = result.vo2max;
    derivedPace = result.paceKm;
  }

  const [row] = await db.insert(schema.fitnessTests).values({
    userId,
    testType: input.testType,
    testDate: input.testDate,
    distanceM: input.distanceM ? String(input.distanceM) : null,
    durationSec: input.durationSec ?? null,
    avgPowerW: input.avgPowerW ?? null,
    avgHr: input.avgHr ?? null,
    derivedPace: derivedPace ? String(derivedPace) : null,
    derivedFtp: derivedFtp,
    derivedVo2max: derivedVo2max ? String(derivedVo2max) : null,
    notes: input.notes ?? null,
  }).returning();

  // Also update athlete profile with new values
  if (derivedFtp) {
    await db.update(schema.athleteProfiles)
      .set({ ftpWatts: derivedFtp, updatedAt: new Date() })
      .where(eq(schema.athleteProfiles.userId, userId));
  }
  if (input.testType === 'run_cooper12' && derivedPace) {
    // Update run 5k pace estimate: Cooper pace is ~12min pace, 5k pace ≈ Cooper pace * 0.95
    const estimated5kPace = Math.round(derivedPace * 5 * 0.95);
    await db.update(schema.athleteProfiles)
      .set({ run5kPaceSec: estimated5kPace, updatedAt: new Date() })
      .where(eq(schema.athleteProfiles.userId, userId));
  }

  return mapRow(row!);
}

export async function getLatestTests(userId: string): Promise<{
  swim_t30: FitnessTestResult | null;
  bike_ftp20: FitnessTestResult | null;
  run_cooper12: FitnessTestResult | null;
  history: FitnessTestResult[];
}> {
  const allTests = await db.query.fitnessTests.findMany({
    where: eq(schema.fitnessTests.userId, userId),
    orderBy: [desc(schema.fitnessTests.testDate)],
    limit: 50,
  });

  const latest = (type: TestType) => allTests.find((t) => t.testType === type) ?? null;

  return {
    swim_t30: latest('swim_t30') ? mapRow(latest('swim_t30')!) : null,
    bike_ftp20: latest('bike_ftp20') ? mapRow(latest('bike_ftp20')!) : null,
    run_cooper12: latest('run_cooper12') ? mapRow(latest('run_cooper12')!) : null,
    history: allTests.map(mapRow),
  };
}

function mapRow(row: typeof schema.fitnessTests.$inferSelect): FitnessTestResult {
  return {
    id: row.id,
    testType: row.testType as TestType,
    testDate: row.testDate,
    distanceM: row.distanceM ? Number(row.distanceM) : null,
    durationSec: row.durationSec,
    avgPowerW: row.avgPowerW,
    avgHr: row.avgHr,
    derivedPace: row.derivedPace ? Number(row.derivedPace) : null,
    derivedFtp: row.derivedFtp,
    derivedVo2max: row.derivedVo2max ? Number(row.derivedVo2max) : null,
    notes: row.notes,
    createdAt: row.createdAt,
  };
}
