import type { FastifyInstance, FastifyRequest } from 'fastify';
import { buildOpenApiSpec, buildAnthropicTools } from './openapi.spec.js';

// Rotas de discovery: NAO exigem API Key. Servem o spec OpenAPI e o
// catalogo de tools formato Anthropic para o openclaw (ou qualquer
// outro agente) descobrir os endpoints automaticamente.

function inferBaseUrl(request: FastifyRequest): string {
  const proto = (request.headers['x-forwarded-proto'] as string | undefined) ?? request.protocol;
  const host = (request.headers['x-forwarded-host'] as string | undefined) ?? request.hostname;
  return `${proto}://${host}`;
}

export default async function openapiRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/v1/public/openapi.json', async (request, reply) => {
    reply.header('Cache-Control', 'public, max-age=300');
    return reply.send(buildOpenApiSpec(inferBaseUrl(request)));
  });

  app.get('/api/v1/public/openapi/tools.json', async (_request, reply) => {
    reply.header('Cache-Control', 'public, max-age=300');
    return reply.send({ tools: buildAnthropicTools() });
  });
}
