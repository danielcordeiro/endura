import { eq, and } from 'drizzle-orm';
import { db } from '../../lib/db.js';
import * as schema from '../../../drizzle/schema.js';
import { decrypt, encrypt } from '../../lib/encryption.js';

// ── Config ────────────────────────────────────────────────────────

const PROVIDER = 'intervals_icu';
const API_BASE = 'https://intervals.icu/api/v1';
const BASE_BACKOFF_MS = 1000;
const MAX_RETRIES = 3;

// ── Rate limiter ──────────────────────────────────────────────────

const requestTimestamps: number[] = [];
const MAX_REQUESTS_PER_MINUTE = 30;

function canMakeRequest(): boolean {
  const oneMinuteAgo = Date.now() - 60_000;
  while (requestTimestamps.length > 0 && requestTimestamps[0]! < oneMinuteAgo) {
    requestTimestamps.shift();
  }
  return requestTimestamps.length < MAX_REQUESTS_PER_MINUTE;
}

function recordRequest(): void {
  requestTimestamps.push(Date.now());
}

// ── Token management ──────────────────────────────────────────────

interface IntegrationRow {
  id: string;
  userId: string;
  externalUserId: string | null;
  accessTokenEnc: string;
  refreshTokenEnc: string | null;
  expiresAt: Date | null;
}

async function getValidAccessToken(integration: IntegrationRow): Promise<string> {
  const now = Date.now();
  const bufferMs = 5 * 60 * 1000;

  if (integration.expiresAt && integration.expiresAt.getTime() - bufferMs < now) {
    return await refreshToken(integration);
  }

  return decrypt(integration.accessTokenEnc);
}

async function refreshToken(integration: IntegrationRow): Promise<string> {
  if (!integration.refreshTokenEnc) {
    throw new Error('No refresh token available for intervals.icu');
  }

  const clientId = process.env.INTERVALS_CLIENT_ID;
  const clientSecret = process.env.INTERVALS_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('INTERVALS_CLIENT_ID/SECRET not configured');

  const refreshTokenValue = decrypt(integration.refreshTokenEnc);

  const res = await fetch('https://intervals.icu/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshTokenValue,
      grant_type: 'refresh_token',
    }).toString(),
  });

  if (!res.ok) {
    throw new Error(`Token refresh failed: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  };

  const newAccessEnc = encrypt(data.access_token);
  const newRefreshEnc = data.refresh_token ? encrypt(data.refresh_token) : integration.refreshTokenEnc;
  const newExpiresAt = data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : null;

  await db.update(schema.integrations)
    .set({
      accessTokenEnc: newAccessEnc,
      refreshTokenEnc: newRefreshEnc,
      expiresAt: newExpiresAt,
      updatedAt: new Date(),
    })
    .where(eq(schema.integrations.id, integration.id));

  return data.access_token;
}

// ── Fetch with retry ──────────────────────────────────────────────

async function fetchWithRetry(url: string, token: string, retries: number = MAX_RETRIES): Promise<unknown> {
  for (let attempt = 0; attempt < retries; attempt++) {
    while (!canMakeRequest()) {
      await new Promise((r) => setTimeout(r, 1000));
    }
    recordRequest();

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      return await res.json();
    }

    if (res.status === 429 || res.status >= 500) {
      const backoff = BASE_BACKOFF_MS * Math.pow(2, attempt);
      await new Promise((r) => setTimeout(r, backoff));
      continue;
    }

    throw new Error(`intervals.icu API error: ${res.status} ${await res.text()}`);
  }

  throw new Error(`Max retries (${retries}) exceeded for ${url}`);
}

// ── Wellness data types ───────────────────────────────────────────

interface IntervalsWellness {
  id: string;                    // ISO date "2024-11-20"
  weight?: number | null;
  restingHeartRate?: number | null;
  hrv?: number | null;           // RMSSD or SDNN in ms
  totalSleep?: number | null;    // hours
  sleepScore?: number | null;    // 0-100
  spo2?: number | null;          // %
  bodyBattery?: number | null;   // 0-100
  stressLevel?: number | null;   // 0-100
  sleepingHeartRate?: number | null;
  [key: string]: unknown;
}

// ── Sync wellness for a single user ───────────────────────────────

export async function syncWellnessForUser(userId: string): Promise<{ synced: number; errors: number }> {
  const integration = await db.query.integrations.findFirst({
    where: and(
      eq(schema.integrations.userId, userId),
      eq(schema.integrations.provider, PROVIDER),
      eq(schema.integrations.active, true),
    ),
  });

  if (!integration || !integration.externalUserId) {
    return { synced: 0, errors: 0 };
  }

  // Update sync status
  await db.update(schema.integrations)
    .set({ syncStatus: 'syncing', updatedAt: new Date() })
    .where(eq(schema.integrations.id, integration.id));

  try {
    const token = await getValidAccessToken(integration as IntegrationRow);
    const athleteId = integration.externalUserId;

    // Fetch last 14 days of wellness data
    const today = new Date();
    const oldest = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);
    const oldestStr = oldest.toISOString().split('T')[0]!;
    const newestStr = today.toISOString().split('T')[0]!;

    const url = `${API_BASE}/athlete/${athleteId}/wellness?oldest=${oldestStr}&newest=${newestStr}`;
    const data = (await fetchWithRetry(url, token)) as IntervalsWellness[];

    if (!Array.isArray(data)) {
      throw new Error('Unexpected response format from intervals.icu wellness API');
    }

    let synced = 0;
    let errors = 0;

    for (const record of data) {
      try {
        await upsertWellnessRecord(userId, record);
        synced++;
      } catch {
        errors++;
      }
    }

    // Update sync status
    await db.update(schema.integrations)
      .set({ syncStatus: 'idle', lastSyncAt: new Date(), updatedAt: new Date() })
      .where(eq(schema.integrations.id, integration.id));

    // Log
    await db.insert(schema.syncLogs).values({
      userId,
      provider: PROVIDER,
      outcome: errors === 0 ? 'success' : 'failure',
      activitiesSynced: synced,
      errorDetails: errors > 0 ? `${errors} records failed` : null,
    });

    return { synced, errors };
  } catch (err) {
    await db.update(schema.integrations)
      .set({ syncStatus: 'error', updatedAt: new Date() })
      .where(eq(schema.integrations.id, integration.id));

    await db.insert(schema.syncLogs).values({
      userId,
      provider: PROVIDER,
      outcome: 'failure',
      activitiesSynced: 0,
      errorDetails: err instanceof Error ? err.message : String(err),
    });

    throw err;
  }
}

// ── Upsert wellness record ────────────────────────────────────────

async function upsertWellnessRecord(userId: string, record: IntervalsWellness): Promise<void> {
  const dateStr = record.id; // "2024-11-20" format

  // Check if exists
  const existing = await db.query.dailyMetrics.findFirst({
    where: and(
      eq(schema.dailyMetrics.userId, userId),
      eq(schema.dailyMetrics.date, dateStr),
    ),
  });

  const wellnessData = {
    hrvMs: record.hrv != null && record.hrv > 0 ? String(record.hrv) : null,
    restingHr: record.restingHeartRate ?? record.sleepingHeartRate ?? null,
    sleepDurationH: record.totalSleep != null ? String(record.totalSleep) : null,
    sleepScore: record.sleepScore ?? null,
    sleepQuality: record.sleepScore != null ? Math.round(record.sleepScore / 20) : null, // 0-100 → 1-5
    spo2: record.spo2 ?? null,
    stressLevel: record.stressLevel ?? null,
    bodyBattery: record.bodyBattery ?? null,
    weightKg: record.weight != null ? String(record.weight) : null,
    source: 'intervals_icu',
    updatedAt: new Date(),
  };

  if (existing) {
    await db.update(schema.dailyMetrics)
      .set(wellnessData)
      .where(and(
        eq(schema.dailyMetrics.userId, userId),
        eq(schema.dailyMetrics.date, dateStr),
      ));
  } else {
    await db.insert(schema.dailyMetrics).values({
      userId,
      date: dateStr,
      ...wellnessData,
    });
  }
}

// ── Sync all connected users ──────────────────────────────────────

export async function syncAllUsersWellness(): Promise<{ total: number; succeeded: number; failed: number }> {
  const integrations = await db.query.integrations.findMany({
    where: and(
      eq(schema.integrations.provider, PROVIDER),
      eq(schema.integrations.active, true),
    ),
  });

  let succeeded = 0;
  let failed = 0;

  for (const integration of integrations) {
    try {
      await syncWellnessForUser(integration.userId);
      succeeded++;
    } catch {
      failed++;
    }
  }

  return { total: integrations.length, succeeded, failed };
}

// ── Get latest wellness for user ──────────────────────────────────

export async function getLatestWellness(userId: string): Promise<{
  hrv: number | null;
  restingHr: number | null;
  sleepDurationH: number | null;
  sleepScore: number | null;
  spo2: number | null;
  stressLevel: number | null;
  bodyBattery: number | null;
  date: string | null;
} | null> {
  const today = new Date().toISOString().split('T')[0]!;
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]!;

  // Get most recent wellness data (within last 3 days)
  const records = await db.query.dailyMetrics.findMany({
    where: and(
      eq(schema.dailyMetrics.userId, userId),
      eq(schema.dailyMetrics.source, 'intervals_icu'),
    ),
    orderBy: (dm, { desc }) => [desc(dm.date)],
    limit: 1,
  });

  const record = records[0];
  if (!record || record.date < threeDaysAgo) return null;

  return {
    hrv: record.hrvMs ? Number(record.hrvMs) : null,
    restingHr: record.restingHr,
    sleepDurationH: record.sleepDurationH ? Number(record.sleepDurationH) : null,
    sleepScore: record.sleepScore,
    spo2: record.spo2,
    stressLevel: record.stressLevel,
    bodyBattery: record.bodyBattery,
    date: record.date,
  };
}
