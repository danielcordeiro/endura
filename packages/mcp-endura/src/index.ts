#!/usr/bin/env node
// Servidor MCP (stdio) do Endura.
// Expõe a API pública do Endura como tools para clientes MCP (Claude Code/Desktop).
// IMPORTANTE: stdout é o canal do transporte MCP — todo log vai para stderr.

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { EnduraClient, EnduraError } from './client.js';
import { TOOLS } from './tools.js';

const baseUrl = process.env.ENDURA_API_URL ?? 'http://localhost:8080';
const apiKey = process.env.ENDURA_API_KEY;

if (!apiKey) {
  console.error('[endura-mcp] ENDURA_API_KEY não definido. Gere uma API Key no Endura (bundle "Coach") e exporte ENDURA_API_KEY.');
  process.exit(1);
}

const client = new EnduraClient({ baseUrl, apiKey });

const server = new Server(
  { name: 'endura', version: '0.1.0' },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS.map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })),
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const tool = TOOLS.find((t) => t.name === request.params.name);
  if (!tool) {
    return { isError: true, content: [{ type: 'text', text: `Tool desconhecida: ${request.params.name}` }] };
  }
  try {
    const args = (request.params.arguments ?? {}) as Record<string, unknown>;
    const result = await tool.call(args, client);
    return { content: [{ type: 'text', text: JSON.stringify(result ?? { ok: true }, null, 2) }] };
  } catch (err) {
    const msg = err instanceof EnduraError
      ? `[${err.status} ${err.code}] ${err.message}`
      : err instanceof Error ? err.message : String(err);
    return { isError: true, content: [{ type: 'text', text: `Erro Endura: ${msg}` }] };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error(`[endura-mcp] conectado (stdio) → ${baseUrl} · ${TOOLS.length} tools`);
