import type { FastifyRequest, FastifyReply } from 'fastify';
import { verifyAccessToken } from './auth.service.js';

// ── Augmentação do tipo FastifyRequest ──────────────────────────

declare module 'fastify' {
  interface FastifyRequest {
    userId: string;
    userRole: string;
  }
}

/**
 * Middleware de autenticacao para rotas protegidas.
 *
 * Extrai o JWT do header `Authorization: Bearer <token>`,
 * verifica a assinatura com JWT_PUBLIC_KEY (RS256),
 * e adiciona `request.userId` e `request.userRole` ao request.
 *
 * Retorna 401 se o token for invalido ou estiver ausente.
 */
export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const authHeader = request.headers.authorization;

  if (!authHeader) {
    request.log.warn('Requisicao sem header Authorization');
    reply.status(401).send({
      code: 'ERR_NO_TOKEN',
      message: 'Token de autenticacao nao fornecido',
      status: 401,
    });
    return;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    request.log.warn('Header Authorization com formato invalido');
    reply.status(401).send({
      code: 'ERR_INVALID_AUTH_HEADER',
      message: 'Formato do header Authorization invalido. Use: Bearer <token>',
      status: 401,
    });
    return;
  }

  const token = parts[1];
  if (!token) {
    reply.status(401).send({
      code: 'ERR_NO_TOKEN',
      message: 'Token de autenticacao nao fornecido',
      status: 401,
    });
    return;
  }

  try {
    const payload = await verifyAccessToken(token);

    request.userId = payload.sub;
    request.userRole = payload.role;
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'code' in err && 'status' in err) {
      const appErr = err as { code: string; message: string; status: number };
      request.log.warn({ code: appErr.code }, appErr.message);
      reply.status(appErr.status).send({
        code: appErr.code,
        message: appErr.message,
        status: appErr.status,
      });
      return;
    }

    request.log.error(err, 'Erro inesperado na verificacao do token');
    reply.status(401).send({
      code: 'ERR_INVALID_TOKEN',
      message: 'Token invalido ou expirado',
      status: 401,
    });
  }
}
