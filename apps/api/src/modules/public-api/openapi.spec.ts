// Spec OpenAPI 3.1 e catalogo de tools para o openclaw.
// Mantido manualmente pra evitar overhead de anotar cada rota com schema.
// Quando crescer, vale migrar para fastify-type-provider-zod + @fastify/swagger.

export interface OpenApiSpec {
  openapi: '3.1.0';
  info: { title: string; version: string; description: string };
  servers: Array<{ url: string; description: string }>;
  security: Array<Record<string, string[]>>;
  components: { securitySchemes: Record<string, unknown>; schemas: Record<string, unknown> };
  tags: Array<{ name: string; description: string }>;
  paths: Record<string, Record<string, unknown>>;
}

const BASE = '/api/v1/public';

const errorSchema = {
  type: 'object',
  required: ['code', 'message', 'status'],
  properties: {
    code: { type: 'string', example: 'ERR_VALIDATION' },
    message: { type: 'string' },
    status: { type: 'integer' },
  },
};

const nutritionItemSchema = {
  type: 'object',
  required: ['phase', 'productName'],
  properties: {
    phase: { type: 'string', enum: ['pre', 'during', 'post'] },
    minuteOffset: { type: 'integer', description: 'Minutos desde o inicio da atividade' },
    productName: { type: 'string', minLength: 1 },
    brand: { type: 'string' },
    quantity: { type: 'number', minimum: 0 },
    unit: { type: 'string', enum: ['g', 'ml', 'unit'] },
    carbsG: { type: 'number', minimum: 0 },
    sodiumMg: { type: 'number', minimum: 0 },
    caffeineMg: { type: 'number', minimum: 0 },
    kcal: { type: 'integer', minimum: 0 },
    source: { type: 'string', enum: ['manual', 'protocol', 'ocr', 'agent'], default: 'manual' },
  },
};

export function buildOpenApiSpec(baseUrl: string): OpenApiSpec {
  return {
    openapi: '3.1.0',
    info: {
      title: 'Endura Public API',
      version: '1.0.0',
      description: 'API publica do Endura para integracao com agentes IA (ex: openclaw). Autenticacao via API Key.',
    },
    servers: [{ url: baseUrl, description: 'Servidor atual' }],
    security: [{ ApiKeyAuth: [] }],
    components: {
      securitySchemes: {
        ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' },
        BearerAuth: { type: 'http', scheme: 'bearer' },
      },
      schemas: { Error: errorSchema, NutritionItem: nutritionItemSchema },
    },
    tags: [
      { name: 'profile', description: 'Perfil e snapshot do atleta' },
      { name: 'activities', description: 'Atividades executadas' },
      { name: 'planned', description: 'Treinos planejados' },
      { name: 'wellness', description: 'Wellness, PMC, readiness, checkins' },
      { name: 'nutrition', description: 'Suplementacao e catalogo' },
      { name: 'analytics', description: 'Agregacoes e analises' },
      { name: 'coach', description: 'Memoria do coach: contexto, analises e diretrizes persistentes' },
      { name: 'plan', description: 'Escrita autoritativa de planos e treinos' },
    ],
    paths: {
      [`${BASE}/me`]: {
        get: {
          tags: ['profile'],
          summary: 'Perfil do atleta',
          security: [{ ApiKeyAuth: [] }],
          'x-scope': 'read:profile',
          responses: { '200': { description: 'Perfil retornado' }, '401': errorRef(), '403': errorRef() },
        },
      },
      [`${BASE}/summary`]: {
        get: {
          tags: ['profile'],
          summary: 'Snapshot rico: proximo treino, atividade de hoje, wellness, prova ativa',
          'x-scope': 'read:profile',
          responses: { '200': { description: 'Snapshot retornado' } },
        },
      },
      [`${BASE}/activities`]: {
        get: {
          tags: ['activities'],
          summary: 'Lista atividades executadas',
          'x-scope': 'read:activities',
          parameters: [
            queryParam('from', 'string', 'YYYY-MM-DD'),
            queryParam('to', 'string', 'YYYY-MM-DD'),
            queryParam('discipline', 'string', 'run | bike | swim | other | brick'),
            queryParam('limit', 'integer', '1-200, default 50'),
            queryParam('offset', 'integer', 'default 0'),
          ],
          responses: { '200': { description: 'Lista paginada' } },
        },
      },
      [`${BASE}/activities/{id}`]: {
        get: {
          tags: ['activities'],
          summary: 'Detalhe de atividade',
          'x-scope': 'read:activities',
          parameters: [pathParam('id', 'UUID da atividade')],
          responses: { '200': { description: 'Atividade' }, '404': errorRef() },
        },
      },
      [`${BASE}/activities/{id}/nutrition`]: {
        get: {
          tags: ['nutrition'],
          summary: 'Log de nutricao da atividade + comparison vs protocolo',
          'x-scope': 'read:activities',
          parameters: [pathParam('id', 'UUID da atividade')],
          responses: { '200': { description: 'Log + comparison' } },
        },
      },
      [`${BASE}/activities/{id}/nutrition-items`]: {
        post: {
          tags: ['nutrition'],
          summary: 'Adiciona 1 item de suplementacao ao log da atividade',
          'x-scope': 'write:nutrition',
          parameters: [pathParam('id', 'UUID da atividade')],
          requestBody: jsonBody('#/components/schemas/NutritionItem'),
          responses: { '201': { description: 'Item criado' }, '404': errorRef() },
        },
      },
      [`${BASE}/activities/{id}/nutrition-items/bulk`]: {
        post: {
          tags: ['nutrition'],
          summary: 'Adiciona varios itens em transacao (max 30). Use sempre que o usuario descrever multiplos produtos numa frase so.',
          'x-scope': 'write:nutrition',
          parameters: [pathParam('id', 'UUID da atividade')],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', required: ['items'], properties: {
              items: { type: 'array', minItems: 1, maxItems: 30, items: { $ref: '#/components/schemas/NutritionItem' } },
            } } } },
          },
          responses: { '201': { description: 'Itens criados' }, '404': errorRef() },
        },
      },
      [`${BASE}/activities/{id}/nutrition-items/{itemId}`]: {
        put: {
          tags: ['nutrition'],
          summary: 'Atualiza um item do log',
          'x-scope': 'write:nutrition',
          parameters: [pathParam('id', 'UUID da atividade'), pathParam('itemId', 'UUID do item')],
          requestBody: jsonBody('#/components/schemas/NutritionItem'),
          responses: { '200': { description: 'Item atualizado' }, '404': errorRef() },
        },
        delete: {
          tags: ['nutrition'],
          summary: 'Remove um item do log',
          'x-scope': 'write:nutrition',
          parameters: [pathParam('id', 'UUID da atividade'), pathParam('itemId', 'UUID do item')],
          responses: { '204': { description: 'Removido' }, '404': errorRef() },
        },
      },
      [`${BASE}/activities/{id}/follow-protocol`]: {
        post: {
          tags: ['nutrition'],
          summary: 'Copia o protocolo prescrito para o log (1-tap)',
          'x-scope': 'write:nutrition',
          parameters: [pathParam('id', 'UUID da atividade')],
          requestBody: { required: true, content: { 'application/json': { schema: {
            type: 'object', required: ['protocolId'],
            properties: { protocolId: { type: 'string', format: 'uuid' } },
          } } } },
          responses: { '201': { description: 'Log criado a partir do protocolo' } },
        },
      },
      [`${BASE}/activities/{id}/feedback`]: {
        post: {
          tags: ['activities'],
          summary: 'Registra feedback pos-treino (RPE, notas, eventos adversos)',
          'x-scope': 'write:checkin',
          parameters: [pathParam('id', 'UUID da atividade')],
          requestBody: { required: true, content: { 'application/json': { schema: {
            type: 'object',
            properties: {
              perceivedEffort: { type: 'integer', minimum: 1, maximum: 10, description: 'RPE escala Borg CR10' },
              notes: { type: 'string', maxLength: 2000 },
              adverseEvents: { type: 'array', items: { type: 'string' }, maxItems: 20 },
            },
          } } } },
          responses: { '200': { description: 'Feedback gravado' } },
        },
      },
      [`${BASE}/activities/{id}/insights`]: {
        get: {
          tags: ['activities'],
          summary: 'Lista insights de IA da atividade',
          'x-scope': 'read:activities',
          parameters: [pathParam('id', 'UUID da atividade')],
          responses: { '200': { description: 'Insights' } },
        },
      },
      [`${BASE}/activities/{id}/comments`]: {
        get: {
          tags: ['activities'],
          summary: 'Lista comentarios da atividade',
          'x-scope': 'read:activities',
          parameters: [pathParam('id', 'UUID da atividade')],
          responses: { '200': { description: 'Comentarios' } },
        },
        post: {
          tags: ['activities'],
          summary: 'Posta um comentario (ex: observacao do coach IA)',
          'x-scope': 'write:comments',
          parameters: [pathParam('id', 'UUID da atividade')],
          requestBody: { required: true, content: { 'application/json': { schema: {
            type: 'object', required: ['text'],
            properties: { text: { type: 'string', minLength: 1, maxLength: 2000 } },
          } } } },
          responses: { '201': { description: 'Comentario criado' } },
        },
      },
      [`${BASE}/planned-workouts`]: {
        get: {
          tags: ['planned'],
          summary: 'Lista treinos planejados',
          'x-scope': 'read:planned',
          parameters: [
            queryParam('from', 'string', 'YYYY-MM-DD'),
            queryParam('to', 'string', 'YYYY-MM-DD'),
            queryParam('discipline', 'string'),
          ],
          responses: { '200': { description: 'Lista' } },
        },
      },
      [`${BASE}/planned-workouts/{id}`]: {
        get: {
          tags: ['planned'],
          summary: 'Detalhe do treino planejado (com protocolo nutricional)',
          'x-scope': 'read:planned',
          parameters: [pathParam('id', 'UUID do treino')],
          responses: { '200': { description: 'Detalhe' }, '404': errorRef() },
        },
        put: {
          tags: ['plan'],
          summary: 'Atualiza (adapta) um treino planejado',
          'x-scope': 'write:planned',
          parameters: [pathParam('id', 'UUID do treino')],
          responses: { '200': { description: 'Atualizado' }, '404': errorRef() },
        },
        delete: {
          tags: ['plan'],
          summary: 'Remove um treino planejado',
          'x-scope': 'write:planned',
          parameters: [pathParam('id', 'UUID do treino')],
          responses: { '204': { description: 'Removido' }, '404': errorRef() },
        },
      },
      [`${BASE}/wellness`]: {
        get: {
          tags: ['wellness'],
          summary: 'Metricas diarias (HRV, sono, peso, etc)',
          'x-scope': 'read:wellness',
          parameters: [queryParam('from', 'string'), queryParam('to', 'string')],
          responses: { '200': { description: 'Series temporais' } },
        },
      },
      [`${BASE}/performance/pmc`]: {
        get: {
          tags: ['wellness'],
          summary: 'Performance Management Chart (CTL/ATL/TSB)',
          'x-scope': 'read:wellness',
          parameters: [queryParam('from', 'string'), queryParam('to', 'string')],
          responses: { '200': { description: 'Serie PMC' } },
        },
      },
      [`${BASE}/performance/readiness`]: {
        get: {
          tags: ['wellness'],
          summary: 'Avaliacao mais recente de prontidao (score + nivel + recomendacao)',
          'x-scope': 'read:wellness',
          responses: { '200': { description: 'Readiness atual' } },
        },
      },
      [`${BASE}/race-goals`]: {
        get: {
          tags: ['profile'],
          summary: 'Provas cadastradas',
          'x-scope': 'read:profile',
          responses: { '200': { description: 'Lista' } },
        },
      },
      [`${BASE}/fitness-tests`]: {
        get: {
          tags: ['wellness'],
          summary: 'Testes de fitness realizados',
          'x-scope': 'read:wellness',
          responses: { '200': { description: 'Lista' } },
        },
      },
      [`${BASE}/daily-checkin`]: {
        post: {
          tags: ['wellness'],
          summary: 'Registra check-in diario (feeling 1-5, soreness 1-5, nota de lesao opcional)',
          'x-scope': 'write:checkin',
          requestBody: { required: true, content: { 'application/json': { schema: {
            type: 'object', required: ['feeling', 'muscleSoreness'],
            properties: {
              date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$', description: 'Default: hoje' },
              feeling: { type: 'integer', minimum: 1, maximum: 5 },
              muscleSoreness: { type: 'integer', minimum: 1, maximum: 5 },
              injuryNote: { type: 'string', maxLength: 500, nullable: true },
            },
          } } } },
          responses: { '201': { description: 'Check-in criado/atualizado' } },
        },
        get: {
          tags: ['wellness'],
          summary: 'Historico de check-ins',
          'x-scope': 'read:wellness',
          parameters: [queryParam('from', 'string'), queryParam('to', 'string')],
          responses: { '200': { description: 'Lista' } },
        },
      },
      [`${BASE}/nutrition/catalog/search`]: {
        get: {
          tags: ['nutrition'],
          summary: 'Busca produto no catalogo curado (resolve nome canonico + macros)',
          'x-scope': 'read:catalog',
          parameters: [
            queryParam('q', 'string', 'Termo de busca (>=2 chars)'),
            queryParam('category', 'string', 'gel | isotonic | bar | salt_capsule | caffeine | other'),
            queryParam('limit', 'integer', '1-20, default 10'),
          ],
          responses: { '200': { description: 'Produtos' } },
        },
      },
      [`${BASE}/nutrition/presets`]: {
        get: {
          tags: ['nutrition'],
          summary: 'Presets de suplementacao do usuario',
          'x-scope': 'read:catalog',
          responses: { '200': { description: 'Lista' } },
        },
      },
      [`${BASE}/coach/context`]: {
        get: {
          tags: ['coach'],
          summary: 'ÂNCORA: base completa da sessão (perfil do coach, diretrizes ativas, ultimas analises, snapshot). Chame primeiro.',
          'x-scope': 'read:coach',
          responses: { '200': { description: 'Contexto completo' } },
        },
      },
      [`${BASE}/coach/assessments`]: {
        get: {
          tags: ['coach'],
          summary: 'Historico de analises salvas',
          'x-scope': 'read:coach',
          parameters: [queryParam('from', 'string'), queryParam('to', 'string'), queryParam('type', 'string'), queryParam('limit', 'integer')],
          responses: { '200': { description: 'Lista' } },
        },
        post: {
          tags: ['coach'],
          summary: 'Salva uma analise no historico permanente',
          'x-scope': 'write:coach',
          requestBody: { required: true, content: { 'application/json': { schema: {
            type: 'object', required: ['type', 'summary'],
            properties: {
              type: { type: 'string', enum: ['weekly_review', 'readiness', 'race_projection', 'plan_rationale', 'ad_hoc'] },
              title: { type: 'string' }, summary: { type: 'string' }, data: { type: 'object' },
              periodFrom: { type: 'string' }, periodTo: { type: 'string' }, raceGoalId: { type: 'string', format: 'uuid' },
            },
          } } } },
          responses: { '201': { description: 'Analise salva' } },
        },
      },
      [`${BASE}/coach/directives`]: {
        get: {
          tags: ['coach'],
          summary: 'Diretrizes do coach (default status=active)',
          'x-scope': 'read:coach',
          parameters: [queryParam('status', 'string', 'active | superseded | done')],
          responses: { '200': { description: 'Lista' } },
        },
        post: {
          tags: ['coach'],
          summary: 'Cria diretriz ativa (opcional: supersedesId para aposentar a anterior)',
          'x-scope': 'write:coach',
          requestBody: { required: true, content: { 'application/json': { schema: {
            type: 'object', required: ['kind', 'text'],
            properties: {
              kind: { type: 'string', enum: ['training', 'nutrition', 'recovery', 'supplementation'] },
              text: { type: 'string' }, rationale: { type: 'string' },
              supersedesId: { type: 'string', format: 'uuid' }, expiresAt: { type: 'string', format: 'date-time' },
            },
          } } } },
          responses: { '201': { description: 'Diretriz criada' } },
        },
      },
      [`${BASE}/coach/directives/{id}`]: {
        patch: {
          tags: ['coach'],
          summary: 'Atualiza status da diretriz',
          'x-scope': 'write:coach',
          parameters: [pathParam('id', 'UUID da diretriz')],
          requestBody: jsonBodyInline({ type: 'object', required: ['status'], properties: { status: { type: 'string', enum: ['active', 'superseded', 'done'] } } }),
          responses: { '200': { description: 'Atualizada' }, '404': errorRef() },
        },
      },
      [`${BASE}/coach/profile`]: {
        put: {
          tags: ['coach'],
          summary: 'Upsert do perfil de coaching (filosofia, restricoes, foco, meta da temporada)',
          'x-scope': 'write:coach',
          requestBody: jsonBodyInline({ type: 'object', properties: {
            philosophy: { type: 'string' }, constraints: { type: 'object' }, currentFocus: { type: 'string' }, seasonGoal: { type: 'string' },
          } }),
          responses: { '200': { description: 'Perfil salvo' } },
        },
      },
      [`${BASE}/race-projection`]: {
        get: {
          tags: ['plan'],
          summary: 'Previsao físico-fisiológica da prova ativa (tempos por disciplina, confianca, fase do plano)',
          'x-scope': 'read:profile',
          responses: { '200': { description: 'Projecao' } },
        },
      },
      [`${BASE}/training-plans`]: {
        post: {
          tags: ['plan'],
          summary: 'Cria container de plano de treino',
          'x-scope': 'write:planned',
          requestBody: jsonBodyInline({ type: 'object', required: ['startDate', 'endDate'], properties: {
            raceGoalId: { type: 'string', format: 'uuid' }, currentPhase: { type: 'string', enum: ['base', 'build', 'peak', 'taper'] },
            startDate: { type: 'string' }, endDate: { type: 'string' }, totalWeeks: { type: 'integer' },
            status: { type: 'string', enum: ['active', 'draft', 'archived'] },
          } }),
          responses: { '201': { description: 'Plano criado' } },
        },
      },
      [`${BASE}/planned-workouts/bulk`]: {
        post: {
          tags: ['plan'],
          summary: 'Cria varios treinos planejados em lote (max 80)',
          'x-scope': 'write:planned',
          requestBody: jsonBodyInline({ type: 'object', required: ['workouts'], properties: {
            workouts: { type: 'array', minItems: 1, maxItems: 80, items: { type: 'object', required: ['scheduledDate', 'discipline'], properties: {
              planId: { type: 'string', format: 'uuid' }, scheduledDate: { type: 'string' },
              discipline: { type: 'string', enum: ['run', 'bike', 'swim', 'other', 'brick'] },
              title: { type: 'string' }, description: { type: 'string' }, structure: { type: 'object' },
              durationMin: { type: 'integer' }, distanceM: { type: 'integer' }, intensityZone: { type: 'string' },
              tssEstimate: { type: 'number' }, week: { type: 'integer' }, phase: { type: 'string' },
            } } },
          } }),
          responses: { '201': { description: 'Treinos criados' } },
        },
      },
      [`${BASE}/planned-workouts/{id}/nutrition-protocol`]: {
        post: {
          tags: ['plan'],
          summary: 'Prescreve suplementacao embutida no treino (substitui o protocolo existente)',
          'x-scope': 'write:planned',
          parameters: [pathParam('id', 'UUID do treino')],
          responses: { '201': { description: 'Protocolo gravado' }, '404': errorRef() },
        },
      },
    },
  };
}

function pathParam(name: string, description: string) {
  return { name, in: 'path', required: true, description, schema: { type: 'string', format: 'uuid' } };
}

function queryParam(name: string, type: string, description = '') {
  return { name, in: 'query', required: false, description, schema: { type } };
}

function jsonBody(ref: string) {
  return { required: true, content: { 'application/json': { schema: { $ref: ref } } } };
}

function jsonBodyInline(schema: Record<string, unknown>) {
  return { required: true, content: { 'application/json': { schema } } };
}

function errorRef() {
  return { description: 'Erro', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } };
}

// ── Catalogo de tools (formato Anthropic) ─────────────────────────
// Gerado a partir do mesmo spec, otimizado pra ser inserido direto em
// system.tools = [...] em apps Claude/OpenAI com adapter trivial.

export interface AnthropicTool {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export function buildAnthropicTools(): AnthropicTool[] {
  return [
    {
      name: 'endura_get_summary',
      description: 'Snapshot do estado atual do atleta: proximo treino planejado, atividade de hoje, wellness mais recente e prova ativa. SEMPRE chame isso primeiro em uma conversa para ancorar contexto.',
      input_schema: { type: 'object', properties: {} },
    },
    {
      name: 'endura_get_readiness',
      description: 'Avaliacao de prontidao mais recente (score + nivel + mentor recommendation). Use antes de recomendar intensidade.',
      input_schema: { type: 'object', properties: {} },
    },
    {
      name: 'endura_list_activities',
      description: 'Lista atividades executadas (Strava/intervals/manuais) num intervalo de datas. Use pra "como foram meus treinos da semana".',
      input_schema: {
        type: 'object',
        properties: {
          from: { type: 'string', description: 'YYYY-MM-DD' },
          to: { type: 'string', description: 'YYYY-MM-DD' },
          discipline: { type: 'string', enum: ['run', 'bike', 'swim', 'other', 'brick'] },
          limit: { type: 'integer', minimum: 1, maximum: 200 },
        },
      },
    },
    {
      name: 'endura_get_activity',
      description: 'Detalhe completo de uma atividade (todos os campos: HR, power, distancia, elevacao, clima, RPE, notes).',
      input_schema: {
        type: 'object', required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
      },
    },
    {
      name: 'endura_get_activity_nutrition',
      description: 'Log de suplementacao da atividade + comparison vs protocolo prescrito (status green/yellow/red para carbs, sodium, etc).',
      input_schema: {
        type: 'object', required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
      },
    },
    {
      name: 'endura_list_planned_workouts',
      description: 'Lista treinos planejados num intervalo. Use pra "o que tenho pra fazer essa semana".',
      input_schema: {
        type: 'object',
        properties: {
          from: { type: 'string', description: 'YYYY-MM-DD' },
          to: { type: 'string', description: 'YYYY-MM-DD' },
          discipline: { type: 'string', enum: ['run', 'bike', 'swim', 'other', 'brick'] },
        },
      },
    },
    {
      name: 'endura_get_pmc',
      description: 'Serie historica CTL/ATL/TSB (Performance Management Chart). Use pra avaliar forma e risco de overtraining.',
      input_schema: {
        type: 'object',
        properties: {
          from: { type: 'string', description: 'YYYY-MM-DD' },
          to: { type: 'string', description: 'YYYY-MM-DD' },
        },
      },
    },
    {
      name: 'endura_get_wellness',
      description: 'Serie diaria de HRV, sono, peso, FC repouso, SpO2, stress.',
      input_schema: {
        type: 'object',
        properties: {
          from: { type: 'string', description: 'YYYY-MM-DD' },
          to: { type: 'string', description: 'YYYY-MM-DD' },
        },
      },
    },
    {
      name: 'endura_search_catalog',
      description: 'Busca produto de suplementacao pelo nome ou marca. Use pra resolver nome canonico antes de logar consumo.',
      input_schema: {
        type: 'object', required: ['q'],
        properties: {
          q: { type: 'string', minLength: 2 },
          category: { type: 'string', enum: ['gel', 'isotonic', 'bar', 'salt_capsule', 'caffeine', 'other'] },
          limit: { type: 'integer', minimum: 1, maximum: 20 },
        },
      },
    },
    {
      name: 'endura_log_nutrition_item',
      description: 'Registra UM item de suplementacao consumido durante a atividade.',
      input_schema: {
        type: 'object', required: ['activityId', 'item'],
        properties: {
          activityId: { type: 'string', format: 'uuid' },
          item: { $ref: '#/components/schemas/NutritionItem' as unknown as never } as unknown as Record<string, unknown>,
        },
      },
    },
    {
      name: 'endura_log_nutrition_bulk',
      description: 'Registra VARIOS itens de suplementacao em transacao. PREFIRA esse endpoint sempre que o usuario descrever multiplos produtos numa frase ("comi 2 geis, 1 sache e 1 isotonico").',
      input_schema: {
        type: 'object', required: ['activityId', 'items'],
        properties: {
          activityId: { type: 'string', format: 'uuid' },
          items: {
            type: 'array', minItems: 1, maxItems: 30,
            items: {
              type: 'object', required: ['phase', 'productName'],
              properties: {
                phase: { type: 'string', enum: ['pre', 'during', 'post'] },
                minuteOffset: { type: 'integer' },
                productName: { type: 'string' },
                brand: { type: 'string' },
                quantity: { type: 'number' },
                unit: { type: 'string', enum: ['g', 'ml', 'unit'] },
                carbsG: { type: 'number' },
                sodiumMg: { type: 'number' },
                caffeineMg: { type: 'number' },
                kcal: { type: 'integer' },
                source: { type: 'string', enum: ['manual', 'protocol', 'ocr', 'agent'], default: 'agent' },
              },
            },
          },
        },
      },
    },
    {
      name: 'endura_follow_protocol',
      description: 'Copia o protocolo prescrito para o log da atividade ("segui o que estava prescrito").',
      input_schema: {
        type: 'object', required: ['activityId', 'protocolId'],
        properties: {
          activityId: { type: 'string', format: 'uuid' },
          protocolId: { type: 'string', format: 'uuid' },
        },
      },
    },
    {
      name: 'endura_log_feedback',
      description: 'Grava feedback pos-treino: RPE (1-10), notas livres, lista de eventos adversos (camara, calor, GI, etc).',
      input_schema: {
        type: 'object', required: ['activityId'],
        properties: {
          activityId: { type: 'string', format: 'uuid' },
          perceivedEffort: { type: 'integer', minimum: 1, maximum: 10 },
          notes: { type: 'string', maxLength: 2000 },
          adverseEvents: { type: 'array', items: { type: 'string' }, maxItems: 20 },
        },
      },
    },
    {
      name: 'endura_log_daily_checkin',
      description: 'Registra check-in subjetivo do dia: feeling (1=horrivel, 5=otimo), soreness (1=sem dor, 5=muita dor), nota de lesao opcional.',
      input_schema: {
        type: 'object', required: ['feeling', 'muscleSoreness'],
        properties: {
          date: { type: 'string', description: 'YYYY-MM-DD, default hoje' },
          feeling: { type: 'integer', minimum: 1, maximum: 5 },
          muscleSoreness: { type: 'integer', minimum: 1, maximum: 5 },
          injuryNote: { type: 'string', maxLength: 500 },
        },
      },
    },
    {
      name: 'endura_post_comment',
      description: 'Posta comentario do coach IA na atividade (fica visivel no histórico do atleta).',
      input_schema: {
        type: 'object', required: ['activityId', 'text'],
        properties: {
          activityId: { type: 'string', format: 'uuid' },
          text: { type: 'string', minLength: 1, maxLength: 2000 },
        },
      },
    },
    // ── Memória do coach (contexto persistente entre sessões) ──────────
    {
      name: 'endura_get_coach_context',
      description: 'ÂNCORA DA SESSÃO — chame SEMPRE primeiro. Retorna a "base" persistida no Endura: perfil do coach (filosofia, restricoes, foco atual, meta da temporada), diretrizes ativas, ultimas 10 analises (coach_assessments), e snapshot (perfil do atleta, proximo treino, atividade de hoje, wellness recente, prova ativa).',
      input_schema: { type: 'object', properties: {} },
    },
    {
      name: 'endura_list_assessments',
      description: 'Lista o historico de analises salvas (coach_assessments). Use pra lembrar o que ja foi concluido em sessoes anteriores.',
      input_schema: {
        type: 'object',
        properties: {
          from: { type: 'string', description: 'YYYY-MM-DD (filtra por periodo analisado)' },
          to: { type: 'string', description: 'YYYY-MM-DD' },
          type: { type: 'string', enum: ['weekly_review', 'readiness', 'race_projection', 'plan_rationale', 'ad_hoc'] },
          limit: { type: 'integer', minimum: 1, maximum: 100 },
        },
      },
    },
    {
      name: 'endura_save_assessment',
      description: 'Salva uma analise no historico permanente do atleta. É assim que o contexto "fica no Endura para sempre". Use ao terminar uma analise (revisao semanal, leitura de prontidao, projecao de prova, racional do plano).',
      input_schema: {
        type: 'object', required: ['type', 'summary'],
        properties: {
          type: { type: 'string', enum: ['weekly_review', 'readiness', 'race_projection', 'plan_rationale', 'ad_hoc'] },
          title: { type: 'string', maxLength: 255 },
          summary: { type: 'string', description: 'Analise legivel por humano (markdown ok)' },
          data: { type: 'object', description: 'Achados estruturados: tendencias, numeros, flags' },
          periodFrom: { type: 'string', description: 'YYYY-MM-DD inicio do periodo analisado' },
          periodTo: { type: 'string', description: 'YYYY-MM-DD fim do periodo analisado' },
          raceGoalId: { type: 'string', format: 'uuid' },
        },
      },
    },
    {
      name: 'endura_list_directives',
      description: 'Lista diretrizes do coach (plano de acao corrente). Default: status=active.',
      input_schema: {
        type: 'object',
        properties: { status: { type: 'string', enum: ['active', 'superseded', 'done'] } },
      },
    },
    {
      name: 'endura_save_directive',
      description: 'Cria uma diretriz ativa (instrucao permanente que a proxima sessao herda). Passe supersedesId para aposentar uma diretriz anterior.',
      input_schema: {
        type: 'object', required: ['kind', 'text'],
        properties: {
          kind: { type: 'string', enum: ['training', 'nutrition', 'recovery', 'supplementation'] },
          text: { type: 'string' },
          rationale: { type: 'string' },
          supersedesId: { type: 'string', format: 'uuid' },
          expiresAt: { type: 'string', format: 'date-time' },
        },
      },
    },
    {
      name: 'endura_update_directive',
      description: 'Atualiza o status de uma diretriz (active | superseded | done).',
      input_schema: {
        type: 'object', required: ['id', 'status'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          status: { type: 'string', enum: ['active', 'superseded', 'done'] },
        },
      },
    },
    {
      name: 'endura_upsert_coach_profile',
      description: 'Cria/atualiza o perfil de coaching do atleta (contexto vivo de longo prazo): filosofia, restricoes, foco atual e meta da temporada.',
      input_schema: {
        type: 'object',
        properties: {
          philosophy: { type: 'string' },
          constraints: { type: 'object', description: 'lesoes, tempo, equipamento, restricoes' },
          currentFocus: { type: 'string' },
          seasonGoal: { type: 'string' },
        },
      },
    },
    // ── Previsão de prova + escrita de plano (autoritativa) ────────────
    {
      name: 'endura_get_race_projection',
      description: 'Previsao físico-fisiológica do Endura para a prova ativa (tempos por disciplina, confianca, fase/progresso do plano). Use como ponto de partida e refine; salve a versao refinada com endura_save_assessment (type=race_projection).',
      input_schema: { type: 'object', properties: {} },
    },
    {
      name: 'endura_create_training_plan',
      description: 'Cria o container de um plano de treino (datas, fase, total de semanas, prova alvo). Depois adicione treinos com endura_upsert_planned_workouts.',
      input_schema: {
        type: 'object', required: ['startDate', 'endDate'],
        properties: {
          raceGoalId: { type: 'string', format: 'uuid' },
          currentPhase: { type: 'string', enum: ['base', 'build', 'peak', 'taper'] },
          startDate: { type: 'string', description: 'YYYY-MM-DD' },
          endDate: { type: 'string', description: 'YYYY-MM-DD' },
          totalWeeks: { type: 'integer', minimum: 1, maximum: 104 },
          status: { type: 'string', enum: ['active', 'draft', 'archived'] },
        },
      },
    },
    {
      name: 'endura_upsert_planned_workouts',
      description: 'Grava VARIOS treinos planejados em lote (max 80). Cada treino: data, disciplina, titulo, descricao, estrutura (warmup/main/cooldown), duracao, distancia, zona de intensidade, TSS estimado, semana, fase. Vincule a um plano via planId.',
      input_schema: {
        type: 'object', required: ['workouts'],
        properties: {
          workouts: {
            type: 'array', minItems: 1, maxItems: 80,
            items: {
              type: 'object', required: ['scheduledDate', 'discipline'],
              properties: {
                planId: { type: 'string', format: 'uuid' },
                scheduledDate: { type: 'string', description: 'YYYY-MM-DD' },
                discipline: { type: 'string', enum: ['run', 'bike', 'swim', 'other', 'brick'] },
                title: { type: 'string' },
                description: { type: 'string' },
                structure: { type: 'object', description: '{ warmup, main, cooldown }' },
                durationMin: { type: 'integer' },
                distanceM: { type: 'integer' },
                intensityZone: { type: 'string', description: 'Z1..Z5' },
                tssEstimate: { type: 'number' },
                week: { type: 'integer' },
                phase: { type: 'string', enum: ['base', 'build', 'peak', 'taper'] },
              },
            },
          },
        },
      },
    },
    {
      name: 'endura_update_planned_workout',
      description: 'Atualiza um treino planejado (adaptacao). Envie so os campos que mudam.',
      input_schema: {
        type: 'object', required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          scheduledDate: { type: 'string' },
          discipline: { type: 'string', enum: ['run', 'bike', 'swim', 'other', 'brick'] },
          title: { type: 'string' },
          description: { type: 'string' },
          structure: { type: 'object' },
          durationMin: { type: 'integer' },
          distanceM: { type: 'integer' },
          intensityZone: { type: 'string' },
          tssEstimate: { type: 'number' },
          week: { type: 'integer' },
          phase: { type: 'string', enum: ['base', 'build', 'peak', 'taper'] },
        },
      },
    },
    {
      name: 'endura_delete_planned_workout',
      description: 'Remove um treino planejado.',
      input_schema: {
        type: 'object', required: ['id'],
        properties: { id: { type: 'string', format: 'uuid' } },
      },
    },
    {
      name: 'endura_set_workout_nutrition',
      description: 'DIFERENCIAL ENDURA: prescreve a suplementacao embutida num treino planejado (itens por fase com carbs/sodio/cafeina/kcal + totais). Substitui o protocolo existente do treino.',
      input_schema: {
        type: 'object', required: ['plannedWorkoutId', 'items'],
        properties: {
          plannedWorkoutId: { type: 'string', format: 'uuid' },
          items: {
            type: 'array', minItems: 1, maxItems: 40,
            items: {
              type: 'object', required: ['phase', 'productName'],
              properties: {
                phase: { type: 'string', enum: ['pre', 'during', 'post'] },
                minuteOffset: { type: 'integer' },
                productName: { type: 'string' },
                brand: { type: 'string' },
                quantity: { type: 'number' },
                unit: { type: 'string', enum: ['g', 'ml', 'unit'] },
                carbsG: { type: 'number' },
                sodiumMg: { type: 'number' },
                caffeineMg: { type: 'number' },
                kcal: { type: 'integer' },
              },
            },
          },
          totalCarbsG: { type: 'number' },
          totalSodiumMg: { type: 'number' },
          totalCaffeineMg: { type: 'number' },
          totalKcal: { type: 'integer' },
          weatherContext: { type: 'object' },
        },
      },
    },
  ];
}
