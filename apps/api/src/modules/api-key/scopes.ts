// ── Scopes tipados para API Keys ──────────────────────────────────
// Reads sao agrupados por recurso. Writes sao agrupados por intencao
// (nutricao, check-in/feedback, comentarios).
// `read:all` e `write:all` sao wildcards que satisfazem qualquer scope
// da sua familia — usados por keys legacy e pelo bundle "Coach".

export const READ_SCOPES = [
  'read:profile',
  'read:activities',
  'read:planned',
  'read:wellness',
  'read:catalog',
  'read:coach',
  'read:health',
] as const;

export const WRITE_SCOPES = [
  'write:nutrition',
  'write:checkin',
  'write:comments',
  'write:coach',
  'write:planned',
  'write:health',
] as const;

export const WILDCARD_SCOPES = ['read:all', 'write:all'] as const;

export const ALL_SCOPES = [
  ...READ_SCOPES,
  ...WRITE_SCOPES,
  ...WILDCARD_SCOPES,
] as const;

export type Scope = typeof ALL_SCOPES[number];

// Bundles convenientes — usados na UI e como defaults.
export const COACH_BUNDLE: Scope[] = [
  ...READ_SCOPES,
  ...WRITE_SCOPES,
];

export const READ_ONLY_BUNDLE: Scope[] = [...READ_SCOPES];

// ── Helpers ───────────────────────────────────────────────────────

export function isScope(value: string): value is Scope {
  return (ALL_SCOPES as readonly string[]).includes(value);
}

export function normalizeScopes(input: string[] | null | undefined): Scope[] {
  if (!input || input.length === 0) return [];
  const seen = new Set<Scope>();
  for (const raw of input) {
    if (isScope(raw)) seen.add(raw);
  }
  return Array.from(seen);
}

// `read:all` satisfaz qualquer `read:*`; `write:all` satisfaz qualquer `write:*`.
// Util pra preservar keys legacy criadas com scope `['read:all']` sem migration.
export function satisfies(granted: readonly string[], required: Scope): boolean {
  if (granted.includes(required)) return true;
  if (required.startsWith('read:') && granted.includes('read:all')) return true;
  if (required.startsWith('write:') && granted.includes('write:all')) return true;
  return false;
}
