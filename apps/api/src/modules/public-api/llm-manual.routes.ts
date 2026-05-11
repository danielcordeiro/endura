import type { FastifyInstance, FastifyRequest } from 'fastify';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// Rotas de discovery para LLMs:
//   GET /llms.txt                          — padrao llmstxt.org (descoberta)
//   GET /api/v1/public/llm-manual.md       — manual narrativo em Markdown
//
// Nenhuma exige API Key. Conteudo cacheado em memoria apos primeira leitura.

let manualCache: string | null = null;

async function loadManual(): Promise<string> {
  if (manualCache) return manualCache;
  // No dev/prod, cwd geralmente e apps/api. Tentamos varios caminhos pra resistir
  // a layouts de deploy diferentes (Render: cd apps/api && node dist/...).
  const candidates = [
    resolve(process.cwd(), '../../docs/llm-manual.md'),
    resolve(process.cwd(), '../docs/llm-manual.md'),
    resolve(process.cwd(), 'docs/llm-manual.md'),
  ];
  for (const path of candidates) {
    try {
      manualCache = await readFile(path, 'utf-8');
      return manualCache;
    } catch {
      // tenta proximo
    }
  }
  throw new Error('docs/llm-manual.md nao encontrado');
}

function inferBaseUrl(request: FastifyRequest): string {
  const proto = (request.headers['x-forwarded-proto'] as string | undefined) ?? request.protocol;
  const host = (request.headers['x-forwarded-host'] as string | undefined) ?? request.hostname;
  return `${proto}://${host}`;
}

function buildLlmsTxt(baseUrl: string): string {
  return `# Endura

> Plataforma de performance para triatletas. API publica para agentes IA consultarem treinos, analisarem performance e registrarem suplementacao/feedback. Autenticacao via API Key per-usuario.

## Comecar aqui

- [Manual para LLM](${baseUrl}/api/v1/public/llm-manual.md): glossario de dominio (TSS, CTL, ATL, TSB, RPE, fueling), conceitos do modelo de dados, fluxos canonicos para registrar suplementacao em linguagem natural, regras invariantes e boas praticas.
- [OpenAPI 3.1 spec](${baseUrl}/api/v1/public/openapi.json): especificacao completa de todos os endpoints publicos.
- [Tools para function calling](${baseUrl}/api/v1/public/openapi/tools.json): 15 tools no formato Anthropic, prontas para colar em \`system.tools\`. Cobre summary, atividades, planned workouts, wellness, PMC, readiness, busca de catalogo, log de nutricao (single + bulk), follow-protocol, feedback, daily check-in e comentarios.

## Documentacao humana

- [Documentacao completa da API](${baseUrl}/docs/api): referencia tecnica com exemplos curl, codigos de erro, modelo de dados.
- [Manual para LLM em HTML](${baseUrl}/docs/llm): mesma fonte do llm-manual.md renderizada como pagina.

## Autenticacao

Toda rota publica (exceto este \`/llms.txt\` e os 3 endpoints de discovery acima) exige header \`X-API-Key: endura_sk_...\` ou \`Authorization: Bearer endura_sk_...\`. Keys sao geradas pelo usuario na UI do Endura com selecao de scopes (read:profile, read:activities, read:planned, read:wellness, read:catalog, write:nutrition, write:checkin, write:comments) e expiracao opcional.
`;
}

export default async function llmManualRoutes(app: FastifyInstance): Promise<void> {
  // Manual em Markdown — fonte direta para LLMs consumirem
  app.get('/api/v1/public/llm-manual.md', async (_request, reply) => {
    const md = await loadManual();
    reply.header('Content-Type', 'text/markdown; charset=utf-8');
    reply.header('Cache-Control', 'public, max-age=300');
    return reply.send(md);
  });

  // Padrao llmstxt.org — entry point para descoberta automatica
  app.get('/llms.txt', async (request, reply) => {
    reply.header('Content-Type', 'text/plain; charset=utf-8');
    reply.header('Cache-Control', 'public, max-age=300');
    return reply.send(buildLlmsTxt(inferBaseUrl(request)));
  });

  // Padrao expandido: /llms-full.txt contem o manual inteiro
  app.get('/llms-full.txt', async (_request, reply) => {
    const md = await loadManual();
    reply.header('Content-Type', 'text/plain; charset=utf-8');
    reply.header('Cache-Control', 'public, max-age=300');
    return reply.send(md);
  });
}
