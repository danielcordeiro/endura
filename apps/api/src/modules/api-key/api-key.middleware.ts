import type { FastifyRequest, FastifyReply } from 'fastify';
import { validateApiKey } from './api-key.service.js';
import { satisfies, type Scope } from './scopes.js';

// ── Augmentacao do tipo FastifyRequest ────────────────────────────
// userId/userRole ja sao declarados em auth.middleware.ts; apenas
// adicionamos os campos especificos de API Key.

declare module 'fastify' {
  interface FastifyRequest {
    apiKeyId?: string;
    apiKeyScopes?: readonly string[];
  }
}

/**
 * Middleware para autenticacao via API Key (publica).
 * Aceita:
 *   - Header "X-API-Key: endura_sk_..."
 *   - Header "Authorization: Bearer endura_sk_..."
 * Define request.userId, request.apiKeyId e request.apiKeyScopes quando valida.
 * Retorna 401 quando ausente ou invalida.
 */
export async function authenticateApiKey(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const xApiKey = request.headers['x-api-key'];
  const authHeader = request.headers.authorization;

  let plainKey: string | null = null;

  if (typeof xApiKey === 'string' && xApiKey.length > 0) {
    plainKey = xApiKey.trim();
  } else if (authHeader) {
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer' && parts[1]) {
      plainKey = parts[1];
    }
  }

  if (!plainKey) {
    reply.status(401).send({
      code: 'ERR_NO_API_KEY',
      message: 'API Key nao fornecida. Use header X-API-Key ou Authorization: Bearer <key>',
      status: 401,
    });
    return;
  }

  try {
    const result = await validateApiKey(plainKey);
    if (!result) {
      reply.status(401).send({
        code: 'ERR_INVALID_API_KEY',
        message: 'API Key invalida, expirada ou revogada',
        status: 401,
      });
      return;
    }

    request.userId = result.userId;
    request.userRole = 'api';
    request.apiKeyId = result.keyId;
    request.apiKeyScopes = result.scopes;
  } catch (err) {
    request.log.error(err, 'Erro ao validar API Key');
    reply.status(500).send({
      code: 'ERR_API_KEY_VALIDATION',
      message: 'Erro ao validar API Key',
      status: 500,
    });
  }
}

/**
 * Hook factory que rejeita requests cuja API Key nao possui o scope informado.
 * Deve ser registrado APOS authenticateApiKey:
 *
 *   { onRequest: [authenticateApiKey, requireScope('write:nutrition')] }
 *
 * Wildcards `read:all` e `write:all` satisfazem qualquer scope da sua familia
 * — preserva keys legacy criadas com scope `['read:all']`.
 */
export function requireScope(scope: Scope) {
  return async function scopeGuard(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const granted = request.apiKeyScopes ?? [];
    if (!satisfies(granted, scope)) {
      reply.status(403).send({
        code: 'ERR_INSUFFICIENT_SCOPE',
        message: `API Key nao possui o scope necessario: ${scope}`,
        status: 403,
      });
    }
  };
}
