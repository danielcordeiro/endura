import { randomBytes, createHash } from 'node:crypto';
import { eq, and, isNull, or, gt } from 'drizzle-orm';
import { db } from '../../lib/db.js';
import * as schema from '../../../drizzle/schema.js';
import { normalizeScopes, READ_ONLY_BUNDLE, type Scope } from './scopes.js';

// ── Constantes ──────────────────────────────────────────────────

const KEY_PREFIX = 'endura_sk_';
const KEY_RANDOM_BYTES = 24; // 32 chars em base64url

// ── Helpers ─────────────────────────────────────────────────────

function generateRandomToken(): string {
  return randomBytes(KEY_RANDOM_BYTES).toString('base64url');
}

function hashKey(plainKey: string): string {
  return createHash('sha256').update(plainKey).digest('hex');
}

function maskKey(plainKey: string): string {
  // Ex: endura_sk_AbCd1234...XyZ9
  const body = plainKey.slice(KEY_PREFIX.length);
  if (body.length <= 12) return plainKey;
  return `${KEY_PREFIX}${body.slice(0, 6)}...${body.slice(-4)}`;
}

// ── Tipos ───────────────────────────────────────────────────────

export interface CreateApiKeyInput {
  name: string;
  scopes?: Scope[];
  expiresInDays?: number | null; // null/undefined = sem expiracao
}

export interface ApiKeyCreatedDTO {
  id: string;
  name: string;
  key: string; // plain text — mostrado UMA vez
  prefix: string;
  scopes: string[];
  expiresAt: string | null;
  createdAt: string;
}

export interface ApiKeyListItemDTO {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  revokedAt: string | null;
}

// ── Criacao ─────────────────────────────────────────────────────

export async function createApiKey(userId: string, input: CreateApiKeyInput): Promise<ApiKeyCreatedDTO> {
  const plainKey = `${KEY_PREFIX}${generateRandomToken()}`;
  const keyHash = hashKey(plainKey);
  const keyPrefix = maskKey(plainKey);
  const normalizedScopes = input.scopes && input.scopes.length > 0
    ? normalizeScopes(input.scopes)
    : READ_ONLY_BUNDLE;

  if (normalizedScopes.length === 0) {
    throw { code: 'ERR_INVALID_SCOPES', message: 'Nenhum scope valido informado', status: 400 };
  }

  const expiresAt = input.expiresInDays && input.expiresInDays > 0
    ? new Date(Date.now() + input.expiresInDays * 86400_000)
    : null;

  const [row] = await db.insert(schema.apiKeys).values({
    userId,
    name: input.name,
    keyHash,
    keyPrefix,
    scopes: normalizedScopes,
    expiresAt,
  }).returning();

  if (!row) {
    throw { code: 'ERR_API_KEY_CREATE_FAILED', message: 'Falha ao criar API Key', status: 500 };
  }

  return {
    id: row.id,
    name: row.name,
    key: plainKey,
    prefix: row.keyPrefix,
    scopes: row.scopes ?? normalizedScopes,
    expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
    createdAt: (row.createdAt ?? new Date()).toISOString(),
  };
}

// ── Listagem ────────────────────────────────────────────────────

export async function listApiKeys(userId: string): Promise<ApiKeyListItemDTO[]> {
  const rows = await db.query.apiKeys.findMany({
    where: eq(schema.apiKeys.userId, userId),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    prefix: r.keyPrefix,
    scopes: r.scopes ?? [],
    expiresAt: r.expiresAt ? r.expiresAt.toISOString() : null,
    lastUsedAt: r.lastUsedAt ? r.lastUsedAt.toISOString() : null,
    createdAt: (r.createdAt ?? new Date()).toISOString(),
    revokedAt: r.revokedAt ? r.revokedAt.toISOString() : null,
  }));
}

// ── Revogacao ───────────────────────────────────────────────────

export async function revokeApiKey(userId: string, keyId: string): Promise<void> {
  const result = await db.update(schema.apiKeys)
    .set({ revokedAt: new Date() })
    .where(and(
      eq(schema.apiKeys.id, keyId),
      eq(schema.apiKeys.userId, userId),
      isNull(schema.apiKeys.revokedAt),
    ))
    .returning({ id: schema.apiKeys.id });

  if (result.length === 0) {
    throw { code: 'ERR_API_KEY_NOT_FOUND', message: 'API Key nao encontrada ou ja revogada', status: 404 };
  }
}

// ── Validacao (usada pelo middleware) ───────────────────────────

export async function validateApiKey(plainKey: string): Promise<{ userId: string; keyId: string; scopes: string[] } | null> {
  if (!plainKey.startsWith(KEY_PREFIX)) return null;
  const keyHash = hashKey(plainKey);

  const row = await db.query.apiKeys.findFirst({
    where: and(
      eq(schema.apiKeys.keyHash, keyHash),
      isNull(schema.apiKeys.revokedAt),
      or(isNull(schema.apiKeys.expiresAt), gt(schema.apiKeys.expiresAt, new Date())),
    ),
  });

  if (!row) return null;

  // Fire-and-forget: atualiza last_used_at sem bloquear a requisicao
  db.update(schema.apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(schema.apiKeys.id, row.id))
    .catch(() => {}); // ignora erro de update, nao deve invalidar auth

  return { userId: row.userId, keyId: row.id, scopes: row.scopes ?? [] };
}
