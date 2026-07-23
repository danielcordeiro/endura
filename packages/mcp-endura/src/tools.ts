// Catálogo de tools do MCP do Endura. Cada tool = 1 chamada REST na API pública.
// As descrições e schemas espelham apps/api/src/modules/public-api/openapi.spec.ts
// (buildAnthropicTools) + as tools novas de coaching/plano.

import type { EnduraClient } from './client.js';

type Args = Record<string, unknown>;

export interface ToolDef {
  name: string;
  description: string;
  scope: string; // informativo (a API valida de fato via API Key)
  inputSchema: { type: 'object'; properties: Record<string, unknown>; required?: string[] };
  call: (args: Args, client: EnduraClient) => Promise<unknown>;
}

const BASE = '/api/v1/public';
const uid = (v: unknown) => encodeURIComponent(String(v));

function omit(args: Args, keys: string[]): Args {
  const out: Args = {};
  for (const [k, v] of Object.entries(args)) {
    if (!keys.includes(k) && v !== undefined) out[k] = v;
  }
  return out;
}

// ── Schemas reutilizáveis ──────────────────────────────────────────
const dateRange = {
  from: { type: 'string', description: 'YYYY-MM-DD' },
  to: { type: 'string', description: 'YYYY-MM-DD' },
};
const disciplineProp = { type: 'string', enum: ['run', 'bike', 'swim', 'other', 'brick'] };
const nutritionItemProps = {
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
};
const plannedWorkoutProps = {
  planId: { type: 'string', format: 'uuid' },
  scheduledDate: { type: 'string', description: 'YYYY-MM-DD' },
  discipline: disciplineProp,
  title: { type: 'string' },
  description: { type: 'string' },
  structure: { type: 'object', description: '{ warmup, main, cooldown }' },
  durationMin: { type: 'integer' },
  distanceM: { type: 'integer' },
  intensityZone: { type: 'string', description: 'Z1..Z5' },
  tssEstimate: { type: 'number' },
  week: { type: 'integer' },
  phase: { type: 'string', enum: ['base', 'build', 'peak', 'taper'] },
};
const raceProps = {
  distance: { type: 'string', enum: ['sprint', 'olympic', '70.3', 'full', 'run_5k', 'run_10k', 'run_21k', 'run_42k', 'bike_event', 'swim_event', 'other'] },
  raceDate: { type: 'string', description: 'YYYY-MM-DD' },
  goal: { type: 'string', enum: ['finish', 'time'] },
  targetTime: { type: 'integer', description: 'tempo alvo em segundos' },
  raceName: { type: 'string' },
  priority: { type: 'string', enum: ['A', 'B', 'C'], description: 'A=prova alvo, B=importante, C=treino/preparação' },
  location: { type: 'string' },
  notes: { type: 'string' },
  bikeElevationGainM: { type: 'number' },
  runElevationGainM: { type: 'number' },
};

export const TOOLS: ToolDef[] = [
  // ═══════════════ LEITURA — estado do atleta ═══════════════
  {
    name: 'endura_get_summary',
    description: 'Snapshot do estado atual do atleta: próximo treino planejado, atividade de hoje, wellness mais recente e prova ativa. Para sessão de coaching, prefira endura_get_coach_context.',
    scope: 'read:profile',
    inputSchema: { type: 'object', properties: {} },
    call: (_a, c) => c.get(`${BASE}/summary`),
  },
  {
    name: 'endura_get_readiness',
    description: 'Avaliação de prontidão mais recente (score + nível + recomendação + HRV status + VO2max + loadTarget: faixa de TSS-alvo pra hoje). Use antes de recomendar intensidade/carga.',
    scope: 'read:wellness',
    inputSchema: { type: 'object', properties: {} },
    call: (_a, c) => c.get(`${BASE}/performance/readiness`),
  },
  {
    name: 'endura_list_activities',
    description: 'Lista atividades executadas (Strava/intervals/manuais) num intervalo de datas.',
    scope: 'read:activities',
    inputSchema: {
      type: 'object',
      properties: { ...dateRange, discipline: disciplineProp, limit: { type: 'integer', minimum: 1, maximum: 200 } },
    },
    call: (a, c) => c.get(`${BASE}/activities`, { from: a.from, to: a.to, discipline: a.discipline, limit: a.limit }),
  },
  {
    name: 'endura_get_activity',
    description: 'Detalhe completo de uma atividade (HR, power, distância, elevação, clima, RPE, notes). Para bike/run com streams do Strava, inclui `analysis`: NP, IF, TSS (calculado, não estimado), VI, EF, decoupling (Pw:Hr), VAM, curva de potência (peaks.power por duração 5s-90min), zonas de FC/potência e breakdown por lap (analysis.laps[]).',
    scope: 'read:activities',
    inputSchema: { type: 'object', required: ['id'], properties: { id: { type: 'string', format: 'uuid' } } },
    call: (a, c) => c.get(`${BASE}/activities/${uid(a.id)}`),
  },
  {
    name: 'endura_get_activity_nutrition',
    description: 'Log de suplementação da atividade + comparison vs protocolo prescrito (green/yellow/red).',
    scope: 'read:activities',
    inputSchema: { type: 'object', required: ['id'], properties: { id: { type: 'string', format: 'uuid' } } },
    call: (a, c) => c.get(`${BASE}/activities/${uid(a.id)}/nutrition`),
  },
  {
    name: 'endura_list_planned_workouts',
    description: 'Lista treinos planejados num intervalo.',
    scope: 'read:planned',
    inputSchema: { type: 'object', properties: { ...dateRange, discipline: disciplineProp } },
    call: (a, c) => c.get(`${BASE}/planned-workouts`, { from: a.from, to: a.to, discipline: a.discipline }),
  },
  {
    name: 'endura_get_pmc',
    description: 'Série histórica CTL/ATL/TSB (Performance Management Chart). Use para avaliar forma e risco de overtraining.',
    scope: 'read:wellness',
    inputSchema: { type: 'object', properties: { ...dateRange } },
    call: (a, c) => c.get(`${BASE}/performance/pmc`, { from: a.from, to: a.to }),
  },
  {
    name: 'endura_get_pmc_forecast',
    description:
      'Projeção de forma (PMC forward-looking): projeta CTL/ATL/TSB ADIANTE a partir dos treinos planejados até o dia da prova-alvo e avalia se o atleta vai chegar com TSB na faixa ideal de pico (status: ideal/too_fresh/too_fatigued/building/no_plan/no_race). Responde "vou chegar na forma certa pra prova?" e orienta ajustes (adicionar carga se too_fresh, antecipar taper se too_fatigued). horizonDays opcional (1-240); default = até a prova.',
    scope: 'read:wellness',
    inputSchema: { type: 'object', properties: { horizonDays: { type: 'number', description: 'Dias a projetar (1-240). Default: até a prova.' } } },
    call: (a, c) => c.get(`${BASE}/performance/pmc-forecast`, { horizonDays: a.horizonDays }),
  },
  {
    name: 'endura_get_recovery',
    description:
      'Recovery score (estilo WHOOP) 0-100: recuperação FISIOLÓGICA do dia (HRV, FC repouso, sono, freq. respiratória) comparada ao baseline pessoal do atleta — independente da carga (TSB). Retorna score, banda (green/yellow/red), sub-score por métrica e recomendação. Use junto com readiness (forma+subjetivo) e pmc para uma leitura completa.',
    scope: 'read:wellness',
    inputSchema: { type: 'object', properties: {} },
    call: (_a, c) => c.get(`${BASE}/performance/recovery`),
  },
  {
    name: 'endura_get_wellness',
    description: 'Série diária de HRV (+ status e baseline), sono, peso, FC repouso, SpO2, stress, VO2max, frequência respiratória.',
    scope: 'read:wellness',
    inputSchema: { type: 'object', properties: { ...dateRange } },
    call: (a, c) => c.get(`${BASE}/wellness`, { from: a.from, to: a.to }),
  },
  {
    name: 'endura_search_catalog',
    description: 'Busca produto de suplementação pelo nome ou marca. Use para resolver nome canônico antes de logar consumo.',
    scope: 'read:catalog',
    inputSchema: {
      type: 'object', required: ['q'],
      properties: {
        q: { type: 'string', minLength: 2 },
        category: { type: 'string', enum: ['gel', 'isotonic', 'bar', 'salt_capsule', 'caffeine', 'other'] },
        limit: { type: 'integer', minimum: 1, maximum: 20 },
      },
    },
    call: (a, c) => c.get(`${BASE}/nutrition/catalog/search`, { q: a.q, category: a.category, limit: a.limit }),
  },

  // ═══════════════ ESCRITA — nutrição / feedback / check-in ═══════════════
  {
    name: 'endura_log_nutrition_item',
    description: 'Registra UM item de suplementação consumido durante a atividade.',
    scope: 'write:nutrition',
    inputSchema: {
      type: 'object', required: ['activityId', 'item'],
      properties: { activityId: { type: 'string', format: 'uuid' }, item: { type: 'object', required: ['phase', 'productName'], properties: { ...nutritionItemProps, source: { type: 'string', enum: ['manual', 'protocol', 'ocr', 'agent'], default: 'agent' } } } },
    },
    call: (a, c) => c.post(`${BASE}/activities/${uid(a.activityId)}/nutrition-items`, { source: 'agent', ...(a.item as Args) }),
  },
  {
    name: 'endura_log_nutrition_bulk',
    description: 'Registra VÁRIOS itens de suplementação em transação. PREFIRA sempre que o usuário descrever múltiplos produtos numa frase.',
    scope: 'write:nutrition',
    inputSchema: {
      type: 'object', required: ['activityId', 'items'],
      properties: {
        activityId: { type: 'string', format: 'uuid' },
        items: { type: 'array', minItems: 1, maxItems: 30, items: { type: 'object', required: ['phase', 'productName'], properties: { ...nutritionItemProps, source: { type: 'string', enum: ['manual', 'protocol', 'ocr', 'agent'], default: 'agent' } } } },
      },
    },
    call: (a, c) => {
      const items = (a.items as Args[]).map((it) => ({ source: 'agent', ...it }));
      return c.post(`${BASE}/activities/${uid(a.activityId)}/nutrition-items/bulk`, { items });
    },
  },
  {
    name: 'endura_follow_protocol',
    description: 'Copia o protocolo prescrito para o log da atividade ("segui o que estava prescrito").',
    scope: 'write:nutrition',
    inputSchema: { type: 'object', required: ['activityId', 'protocolId'], properties: { activityId: { type: 'string', format: 'uuid' }, protocolId: { type: 'string', format: 'uuid' } } },
    call: (a, c) => c.post(`${BASE}/activities/${uid(a.activityId)}/follow-protocol`, { protocolId: a.protocolId }),
  },
  {
    name: 'endura_log_feedback',
    description: 'Grava feedback pós-treino: RPE (1-10), notas livres, lista de eventos adversos.',
    scope: 'write:checkin',
    inputSchema: {
      type: 'object', required: ['activityId'],
      properties: { activityId: { type: 'string', format: 'uuid' }, perceivedEffort: { type: 'integer', minimum: 1, maximum: 10 }, notes: { type: 'string', maxLength: 2000 }, adverseEvents: { type: 'array', items: { type: 'string' }, maxItems: 20 } },
    },
    call: (a, c) => c.post(`${BASE}/activities/${uid(a.activityId)}/feedback`, omit(a, ['activityId'])),
  },
  {
    name: 'endura_log_daily_checkin',
    description: 'Registra check-in subjetivo do dia: feeling (1-5), soreness (1-5), nota de lesão opcional.',
    scope: 'write:checkin',
    inputSchema: {
      type: 'object', required: ['feeling', 'muscleSoreness'],
      properties: { date: { type: 'string', description: 'YYYY-MM-DD, default hoje' }, feeling: { type: 'integer', minimum: 1, maximum: 5 }, muscleSoreness: { type: 'integer', minimum: 1, maximum: 5 }, injuryNote: { type: 'string', maxLength: 500 } },
    },
    call: (a, c) => c.post(`${BASE}/daily-checkin`, omit(a, [])),
  },
  {
    name: 'endura_post_comment',
    description: 'Posta comentário do coach IA na atividade (fica visível no histórico do atleta).',
    scope: 'write:comments',
    inputSchema: { type: 'object', required: ['activityId', 'text'], properties: { activityId: { type: 'string', format: 'uuid' }, text: { type: 'string', minLength: 1, maxLength: 2000 } } },
    call: (a, c) => c.post(`${BASE}/activities/${uid(a.activityId)}/comments`, { text: a.text }),
  },

  // ═══════════════ MEMÓRIA DO COACH (contexto persistente) ═══════════════
  {
    name: 'endura_get_coach_context',
    description: 'ÂNCORA DA SESSÃO — chame SEMPRE primeiro. Retorna a base persistida: perfil do coach (filosofia, restrições, foco, meta), diretrizes ativas, últimas 10 análises, contexto de saúde (médico, plano, exames recentes + guidance de onboarding quando vazio) e snapshot do atleta.',
    scope: 'read:coach',
    inputSchema: { type: 'object', properties: {} },
    call: (_a, c) => c.get(`${BASE}/coach/context`),
  },
  {
    name: 'endura_list_assessments',
    description: 'Lista o histórico de análises salvas (coach_assessments).',
    scope: 'read:coach',
    inputSchema: {
      type: 'object',
      properties: { ...dateRange, type: { type: 'string', enum: ['weekly_review', 'readiness', 'race_projection', 'plan_rationale', 'ad_hoc'] }, limit: { type: 'integer', minimum: 1, maximum: 100 } },
    },
    call: (a, c) => c.get(`${BASE}/coach/assessments`, { from: a.from, to: a.to, type: a.type, limit: a.limit }),
  },
  {
    name: 'endura_save_assessment',
    description: 'Salva uma análise no histórico permanente do atleta. É assim que o contexto fica no Endura para sempre. Use ao terminar uma análise.',
    scope: 'write:coach',
    inputSchema: {
      type: 'object', required: ['type', 'summary'],
      properties: {
        type: { type: 'string', enum: ['weekly_review', 'readiness', 'race_projection', 'plan_rationale', 'ad_hoc'] },
        title: { type: 'string', maxLength: 255 },
        summary: { type: 'string', description: 'Análise legível por humano (markdown ok)' },
        data: { type: 'object', description: 'Achados estruturados: tendências, números, flags' },
        periodFrom: { type: 'string', description: 'YYYY-MM-DD' },
        periodTo: { type: 'string', description: 'YYYY-MM-DD' },
        raceGoalId: { type: 'string', format: 'uuid' },
      },
    },
    call: (a, c) => c.post(`${BASE}/coach/assessments`, omit(a, [])),
  },
  {
    name: 'endura_list_directives',
    description: 'Lista diretrizes do coach (plano de ação corrente). Default: status=active.',
    scope: 'read:coach',
    inputSchema: { type: 'object', properties: { status: { type: 'string', enum: ['active', 'superseded', 'done'] } } },
    call: (a, c) => c.get(`${BASE}/coach/directives`, { status: a.status }),
  },
  {
    name: 'endura_save_directive',
    description: 'Cria uma diretriz ativa (instrução permanente que a próxima sessão herda). Passe supersedesId para aposentar uma anterior.',
    scope: 'write:coach',
    inputSchema: {
      type: 'object', required: ['kind', 'text'],
      properties: {
        kind: { type: 'string', enum: ['training', 'nutrition', 'recovery', 'supplementation'] },
        text: { type: 'string' },
        rationale: { type: 'string' },
        supersedesId: { type: 'string', format: 'uuid' },
        expiresAt: { type: 'string', format: 'date-time' },
      },
    },
    call: (a, c) => c.post(`${BASE}/coach/directives`, omit(a, [])),
  },
  {
    name: 'endura_update_directive',
    description: 'Atualiza o status de uma diretriz (active | superseded | done).',
    scope: 'write:coach',
    inputSchema: { type: 'object', required: ['id', 'status'], properties: { id: { type: 'string', format: 'uuid' }, status: { type: 'string', enum: ['active', 'superseded', 'done'] } } },
    call: (a, c) => c.patch(`${BASE}/coach/directives/${uid(a.id)}`, { status: a.status }),
  },
  {
    name: 'endura_upsert_coach_profile',
    description: 'Cria/atualiza o perfil de coaching do atleta (contexto vivo de longo prazo): filosofia, restrições, foco atual e meta da temporada.',
    scope: 'write:coach',
    inputSchema: {
      type: 'object',
      properties: { philosophy: { type: 'string' }, constraints: { type: 'object' }, currentFocus: { type: 'string' }, seasonGoal: { type: 'string' } },
    },
    call: (a, c) => c.put(`${BASE}/coach/profile`, omit(a, [])),
  },

  // ═══════════════ CONTEXTO PESSOAL / SAÚDE (médico, plano, exames) ═══════════════
  {
    name: 'endura_get_health_profile',
    description: 'Lê o contexto de saúde do atleta: profissionais (médico etc.), plano de saúde, alergias, medicações, condições e notas clínicas. (Também vem resumido em endura_get_coach_context.)',
    scope: 'read:health',
    inputSchema: { type: 'object', properties: {} },
    call: (_a, c) => c.get(`${BASE}/health/profile`),
  },
  {
    name: 'endura_save_health_profile',
    description: 'Cria/atualiza (upsert) o contexto de saúde do atleta. Envie só os campos que mudam. Salve APENAS o que o atleta compartilhar (PHI). providers=profissionais; healthPlan=plano de saúde.',
    scope: 'write:health',
    inputSchema: {
      type: 'object',
      properties: {
        providers: { type: 'array', description: 'Profissionais de saúde', items: { type: 'object', required: ['name'], properties: {
          role: { type: 'string', enum: ['sports_doctor', 'physio', 'nutritionist', 'cardiologist', 'physician', 'other'] },
          name: { type: 'string' }, registro: { type: 'string', description: 'CRM/registro profissional' }, specialty: { type: 'string' }, contact: { type: 'string' },
        } } },
        healthPlan: { type: 'object', description: '{ name, beneficiaryName, beneficiaryId, phone, email, portalUrl }' },
        allergies: { type: 'array', items: { type: 'string' } },
        medications: { type: 'array', items: { type: 'object', required: ['name'], properties: { name: { type: 'string' }, dose: { type: 'string' }, schedule: { type: 'string' }, reason: { type: 'string' } } } },
        conditions: { type: 'array', items: { type: 'string' } },
        notes: { type: 'string' },
      },
    },
    call: (a, c) => c.put(`${BASE}/health/profile`, omit(a, [])),
  },
  {
    name: 'endura_list_exams',
    description: 'Lista exames/documentos médicos do atleta (pedidos e resultados), com filtros opcionais por status, tipo e data.',
    scope: 'read:health',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['requested', 'scheduled', 'collected', 'resulted', 'reviewed'] },
        type: { type: 'string', enum: ['lab_panel', 'ergospirometry', 'echocardiogram', 'imaging', 'other'] },
        ...dateRange,
        limit: { type: 'integer', minimum: 1, maximum: 100 },
      },
    },
    call: (a, c) => c.get(`${BASE}/health/exams`, { status: a.status, type: a.type, from: a.from, to: a.to, limit: a.limit }),
  },
  {
    name: 'endura_add_exam',
    description: 'Registra um exame/documento médico. Use status=requested quando o médico pede; depois atualize com endura_update_exam quando sair o resultado. items=lista {name, tuss}; attachmentRef=link/caminho do PDF (por referência).',
    scope: 'write:health',
    inputSchema: {
      type: 'object', required: ['examType'],
      properties: {
        examType: { type: 'string', enum: ['lab_panel', 'ergospirometry', 'echocardiogram', 'imaging', 'other'] },
        title: { type: 'string' },
        status: { type: 'string', enum: ['requested', 'scheduled', 'collected', 'resulted', 'reviewed'] },
        provider: { type: 'string', description: 'quem pediu / onde foi feito' },
        examDate: { type: 'string', description: 'YYYY-MM-DD' },
        resultDate: { type: 'string', description: 'YYYY-MM-DD' },
        items: { type: 'array', items: { type: 'object', required: ['name'], properties: { name: { type: 'string' }, tuss: { type: 'string' } } } },
        summary: { type: 'string', description: 'achados legíveis (quando houver resultado)' },
        data: { type: 'object', description: 'resultados estruturados (opcional)' },
        attachmentRef: { type: 'string', description: 'link/caminho do PDF' },
      },
    },
    call: (a, c) => c.post(`${BASE}/health/exams`, omit(a, [])),
  },
  {
    name: 'endura_update_exam',
    description: 'Atualiza um exame (ex.: status para resulted + summary/data quando sair o resultado). Envie só os campos que mudam.',
    scope: 'write:health',
    inputSchema: {
      type: 'object', required: ['id'],
      properties: {
        id: { type: 'string', format: 'uuid' },
        status: { type: 'string', enum: ['requested', 'scheduled', 'collected', 'resulted', 'reviewed'] },
        title: { type: 'string' },
        provider: { type: 'string' },
        examDate: { type: 'string', description: 'YYYY-MM-DD' },
        resultDate: { type: 'string', description: 'YYYY-MM-DD' },
        items: { type: 'array', items: { type: 'object', required: ['name'], properties: { name: { type: 'string' }, tuss: { type: 'string' } } } },
        summary: { type: 'string' },
        data: { type: 'object' },
        attachmentRef: { type: 'string' },
      },
    },
    call: (a, c) => c.patch(`${BASE}/health/exams/${uid(a.id)}`, omit(a, ['id'])),
  },

  // ═══════════════ PREVISÃO DE PROVA + ESCRITA DE PLANO ═══════════════
  {
    name: 'endura_get_race_projection',
    description: 'Previsão físico-fisiológica do Endura para a prova ativa (tempos por disciplina, confiança, fase/progresso do plano). Refine e salve com endura_save_assessment (type=race_projection).',
    scope: 'read:profile',
    inputSchema: { type: 'object', properties: {} },
    call: (_a, c) => c.get(`${BASE}/race-projection`),
  },
  // ═══════════════ CALENDÁRIO DE PROVAS ═══════════════
  {
    name: 'endura_list_races',
    description: 'Lista o calendário de provas do atleta (alvo A + provas B/C de preparação), ordenado por data.',
    scope: 'read:profile',
    inputSchema: { type: 'object', properties: {} },
    call: (_a, c) => c.get(`${BASE}/race-goals`),
  },
  {
    name: 'endura_create_race',
    description: 'Adiciona uma prova ao calendário. priority A=prova alvo principal (rebaixa a A anterior para B), B=importante, C=treino/preparação. Ex.: registrar uma meia maratona de preparação como C.',
    scope: 'write:planned',
    inputSchema: { type: 'object', required: ['distance', 'raceDate', 'goal'], properties: raceProps },
    call: (a, c) => c.post(`${BASE}/race-goals`, omit(a, [])),
  },
  {
    name: 'endura_update_race',
    description: 'Atualiza uma prova do calendário (envie só os campos que mudam). Use active=false para arquivar.',
    scope: 'write:planned',
    inputSchema: { type: 'object', required: ['id'], properties: { id: { type: 'string', format: 'uuid' }, ...raceProps, active: { type: 'boolean' } } },
    call: (a, c) => c.put(`${BASE}/race-goals/${uid(a.id)}`, omit(a, ['id'])),
  },
  {
    name: 'endura_delete_race',
    description: 'Remove uma prova do calendário.',
    scope: 'write:planned',
    inputSchema: { type: 'object', required: ['id'], properties: { id: { type: 'string', format: 'uuid' } } },
    call: (a, c) => c.del(`${BASE}/race-goals/${uid(a.id)}`),
  },
  {
    name: 'endura_create_training_plan',
    description: 'Cria o container de um plano de treino (datas, fase, total de semanas, prova alvo). Depois adicione treinos com endura_upsert_planned_workouts.',
    scope: 'write:planned',
    inputSchema: {
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
    call: (a, c) => c.post(`${BASE}/training-plans`, omit(a, [])),
  },
  {
    name: 'endura_upsert_planned_workouts',
    description: 'Grava VÁRIOS treinos planejados em lote (max 80). Cada treino: data, disciplina, título, descrição, estrutura, duração, distância, zona, TSS, semana, fase. Vincule a um plano via planId.',
    scope: 'write:planned',
    inputSchema: {
      type: 'object', required: ['workouts'],
      properties: { workouts: { type: 'array', minItems: 1, maxItems: 80, items: { type: 'object', required: ['scheduledDate', 'discipline'], properties: plannedWorkoutProps } } },
    },
    call: (a, c) => c.post(`${BASE}/planned-workouts/bulk`, { workouts: a.workouts }),
  },
  {
    name: 'endura_update_planned_workout',
    description: 'Atualiza um treino planejado (adaptação). Envie só os campos que mudam.',
    scope: 'write:planned',
    inputSchema: { type: 'object', required: ['id'], properties: { id: { type: 'string', format: 'uuid' }, ...plannedWorkoutProps } },
    call: (a, c) => c.put(`${BASE}/planned-workouts/${uid(a.id)}`, omit(a, ['id'])),
  },
  {
    name: 'endura_delete_planned_workout',
    description: 'Remove um treino planejado.',
    scope: 'write:planned',
    inputSchema: { type: 'object', required: ['id'], properties: { id: { type: 'string', format: 'uuid' } } },
    call: (a, c) => c.del(`${BASE}/planned-workouts/${uid(a.id)}`),
  },
  {
    name: 'endura_set_workout_nutrition',
    description: 'DIFERENCIAL ENDURA: prescreve a suplementação embutida num treino planejado (itens por fase + totais). Substitui o protocolo existente.',
    scope: 'write:planned',
    inputSchema: {
      type: 'object', required: ['plannedWorkoutId', 'items'],
      properties: {
        plannedWorkoutId: { type: 'string', format: 'uuid' },
        items: { type: 'array', minItems: 1, maxItems: 40, items: { type: 'object', required: ['phase', 'productName'], properties: nutritionItemProps } },
        totalCarbsG: { type: 'number' },
        totalSodiumMg: { type: 'number' },
        totalCaffeineMg: { type: 'number' },
        totalKcal: { type: 'integer' },
        weatherContext: { type: 'object' },
      },
    },
    call: (a, c) => c.post(`${BASE}/planned-workouts/${uid(a.plannedWorkoutId)}/nutrition-protocol`, omit(a, ['plannedWorkoutId'])),
  },
];
