# Especificações Técnicas — Endura

*Versão 1.0 | Fevereiro 2026*

---

## 1. Decisões de Arquitetura

### 1.1 Visão Geral

```
┌─────────────────────────────────────────────────────────────┐
│                        USUÁRIO (PWA)                        │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTPS
┌───────────────────────────▼─────────────────────────────────┐
│                    Next.js (Vercel)                         │
│              Frontend + API Routes (BFF)                    │
│   React 19 · App Router · Tailwind · shadcn/ui · PWA       │
└───────────────────────────┬─────────────────────────────────┘
                            │ REST / HTTP
┌───────────────────────────▼─────────────────────────────────┐
│                  Fastify API (Render)                       │
│           Node.js 22 · TypeScript · Drizzle ORM            │
│     Lógica de negócio · Jobs · OAuth · Claude API          │
└──────┬────────────────────┬────────────────────┬────────────┘
       │                    │                    │
┌──────▼──────┐   ┌─────────▼────────┐  ┌───────▼──────────┐
│  Supabase   │   │   Claude API     │  │  APIs Externas   │
│ PostgreSQL  │   │  (Anthropic)     │  │  Strava          │
│ Auth · Files│   │  Planos + Chat   │  │  intervals.icu   │
└─────────────┘   └──────────────────┘  │  OpenWeatherMap  │
                                        └──────────────────┘
```

### 1.2 Por que este stack

| Decisão | Escolha | Alternativa descartada | Motivo |
|---|---|---|---|
| Frontend | Next.js 15 | React + Vite | App Router + Server Actions simplificam BFF; melhor ecossistema PWA |
| Backend | Node.js + Fastify | Spring Boot (Java) | 10x mais rápido de desenvolver; TypeScript unificado; custo de infra menor |
| ORM | Drizzle | Prisma / TypeORM | TypeScript-first; SQL explícito; zero overhead em runtime |
| Banco | Supabase (Postgres) | PlanetScale / Neon | Auth incluso; Storage para fotos (v2 OCR); Row Level Security; free tier generoso |
| IA | Claude API (Anthropic) | OpenAI | Contexto longo (200k tokens); melhor para geração de planos estruturados |
| Jobs | node-cron | BullMQ + Redis | Sem infra extra no MVP; migra para BullMQ quando escala |
| Deploy frontend | Vercel | Netlify | Integração nativa Next.js; CDN global; preview deploys |
| Deploy backend | Render | Railway / Fly.io | Cron jobs nativos; auto-deploy; free tier suficiente no MVP |
| Monorepo | pnpm workspaces | npm workspaces / Turborepo | Simples, sem overhead de build pipeline |

### 1.3 Custo estimado de infraestrutura

| Serviço | Plano MVP | Custo/mês |
|---|---|---|
| Vercel | Hobby (free) | R$ 0 |
| Render | Starter (1 serviço) | ~R$ 40 |
| Supabase | Free tier | R$ 0 |
| Claude API | ~2M tokens/mês | ~R$ 60–120 |
| OpenWeatherMap | Free (1000 calls/dia) | R$ 0 |
| **Total** | | **~R$ 100–160/mês** |

> Supabase Pro (R$ 125/mês) só será necessário após ~500 MAU ou 500MB de dados.

---

## 2. Estrutura do Repositório

```
endura/                          ← monorepo (pnpm workspaces)
├── apps/
│   ├── web/                     ← Next.js 15 (PWA)
│   │   ├── app/                 ← App Router
│   │   │   ├── (auth)/          ← rotas de autenticação
│   │   │   ├── (app)/           ← rotas protegidas
│   │   │   │   ├── dashboard/
│   │   │   │   ├── treino/
│   │   │   │   ├── atividades/
│   │   │   │   ├── nutricao/
│   │   │   │   └── configuracoes/
│   │   │   └── api/             ← BFF routes (OAuth callbacks, webhooks)
│   │   ├── components/
│   │   │   ├── ui/              ← shadcn/ui base
│   │   │   ├── training/        ← componentes de treino
│   │   │   ├── nutrition/       ← componentes de nutrição
│   │   │   └── dashboard/
│   │   ├── lib/
│   │   │   ├── api-client.ts    ← cliente HTTP para o Fastify API
│   │   │   ├── auth.ts          ← helpers de autenticação
│   │   │   └── utils.ts
│   │   └── stores/              ← Zustand stores
│   │
│   └── api/                     ← Fastify + Node.js
│       ├── src/
│       │   ├── modules/
│       │   │   ├── auth/        ← JWT, OAuth Strava, OAuth intervals.icu
│       │   │   ├── athlete/     ← perfil, onboarding
│       │   │   ├── plan/        ← geração de planos via Claude
│       │   │   ├── training/    ← sessões planejadas
│       │   │   ├── activity/    ← atividades sincronizadas
│       │   │   ├── nutrition/   ← protocolos e registros
│       │   │   ├── integration/ ← Strava, intervals.icu
│       │   │   ├── ai/          ← Claude client, prompts
│       │   │   └── coach/       ← módulo treinador (v3)
│       │   ├── jobs/
│       │   │   ├── strava-sync.job.ts
│       │   │   └── token-refresh.job.ts
│       │   ├── lib/
│       │   │   ├── db.ts        ← conexão Drizzle
│       │   │   ├── claude.ts    ← Anthropic SDK client
│       │   │   └── encryption.ts ← AES-256 para tokens
│       │   └── server.ts
│       └── drizzle/
│           ├── schema.ts        ← schema completo
│           └── migrations/
│
└── packages/
    └── types/                   ← tipos TypeScript compartilhados
        ├── athlete.ts
        ├── training.ts
        ├── nutrition.ts
        └── integration.ts
```

---

## 3. Schema do Banco de Dados

### 3.1 Diagrama de entidades

```
users ──────────────────────┐
  │                         │
  ├── athlete_profiles       │ (1:1)
  ├── race_goals             │ (1:N)
  ├── integrations           │ (1:N) ← Strava, intervals.icu
  ├── supplement_presets     │ (1:N)
  ├── training_plans ────────┤
  │     └── planned_workouts │
  │           └── nutrition_protocols
  └── activities ────────────┘
        ├── nutrition_logs
        │     └── nutrition_items
        ├── ai_insights
        └── checkins (semanal)

coach_athletes (fase 3): users ↔ users
activity_comments (fase 3): coach → activity
```

### 3.2 Schema Drizzle (completo)

```typescript
// packages/types / apps/api/src/drizzle/schema.ts

// ── USUÁRIOS ──────────────────────────────────────────────────

export const users = pgTable('users', {
  id:           uuid('id').primaryKey().defaultRandom(),
  email:        varchar('email', { length: 255 }).unique().notNull(),
  name:         varchar('name', { length: 255 }),
  passwordHash: text('password_hash'),               // null se login via OAuth
  role:         varchar('role', { length: 20 })
                  .notNull().default('athlete'),      // 'athlete' | 'coach'
  createdAt:    timestamp('created_at').defaultNow(),
  updatedAt:    timestamp('updated_at').defaultNow(),
});

// ── PERFIL ATLÉTICO (onboarding) ──────────────────────────────

export const athleteProfiles = pgTable('athlete_profiles', {
  id:                uuid('id').primaryKey().defaultRandom(),
  userId:            uuid('user_id').notNull().references(() => users.id),
  level:             varchar('level', { length: 20 }).notNull(),   // iniciante|intermediario|competitivo
  weakestDiscipline: varchar('weakest_discipline', { length: 10 }), // swim|bike|run
  weeklyHours:       numeric('weekly_hours', { precision: 4, scale: 1 }),
  availableDays:     integer('available_days').array(),             // [1,2,3,4,5] = dias da semana
  hasPool:           boolean('has_pool').default(false),
  hasBikeTrainer:    boolean('has_bike_trainer').default(false),
  hasTreadmill:      boolean('has_treadmill').default(false),
  weightKg:          numeric('weight_kg', { precision: 5, scale: 2 }),
  heightCm:          integer('height_cm'),
  maxHr:             integer('max_hr'),
  ftpWatts:          integer('ftp_watts'),
  run5kPaceSec:      integer('run_5k_pace_sec'),                    // pace em segundos/km
  dietaryRestrictions: text('dietary_restrictions').array(),
  ownedProducts:     text('owned_products').array(),               // gel, isotônico, barra...
  giSensitivity:     boolean('gi_sensitivity').default(false),
  sweatRateHigh:     boolean('sweat_rate_high').default(false),
  crampsHistory:     boolean('cramps_history').default(false),
  createdAt:         timestamp('created_at').defaultNow(),
  updatedAt:         timestamp('updated_at').defaultNow(),
});

// ── PROVA ALVO ────────────────────────────────────────────────

export const raceGoals = pgTable('race_goals', {
  id:           uuid('id').primaryKey().defaultRandom(),
  userId:       uuid('user_id').notNull().references(() => users.id),
  distance:     varchar('distance', { length: 20 }).notNull(), // sprint|olympic|70.3|full
  raceDate:     date('race_date').notNull(),
  goal:         varchar('goal', { length: 20 }).notNull(),     // finish|time
  targetTime:   integer('target_time_sec'),                    // null se goal = finish
  raceName:     varchar('race_name', { length: 255 }),
  active:       boolean('active').default(true),
  createdAt:    timestamp('created_at').defaultNow(),
});

// ── INTEGRAÇÕES ───────────────────────────────────────────────

export const integrations = pgTable('integrations', {
  id:                uuid('id').primaryKey().defaultRandom(),
  userId:            uuid('user_id').notNull().references(() => users.id),
  provider:          varchar('provider', { length: 30 }).notNull(), // strava|intervals_icu
  externalUserId:    varchar('external_user_id', { length: 255 }),
  accessTokenEnc:    text('access_token_enc').notNull(),          // criptografado AES-256
  refreshTokenEnc:   text('refresh_token_enc'),
  expiresAt:         timestamp('expires_at'),
  scope:             text('scope'),
  lastSyncAt:        timestamp('last_sync_at'),
  syncStatus:        varchar('sync_status', { length: 20 }).default('idle'),
  active:            boolean('active').default(true),
  createdAt:         timestamp('created_at').defaultNow(),
  updatedAt:         timestamp('updated_at').defaultNow(),
});

// ── PLANOS DE TREINO ──────────────────────────────────────────

export const trainingPlans = pgTable('training_plans', {
  id:             uuid('id').primaryKey().defaultRandom(),
  userId:         uuid('user_id').notNull().references(() => users.id),
  raceGoalId:     uuid('race_goal_id').references(() => raceGoals.id),
  currentPhase:   varchar('current_phase', { length: 20 }),  // base|build|peak|taper
  startDate:      date('start_date').notNull(),
  endDate:        date('end_date').notNull(),
  totalWeeks:     integer('total_weeks'),
  status:         varchar('status', { length: 20 }).default('active'), // active|paused|completed
  generatedAt:    timestamp('generated_at').defaultNow(),
  lastAdaptedAt:  timestamp('last_adapted_at'),
});

export const plannedWorkouts = pgTable('planned_workouts', {
  id:              uuid('id').primaryKey().defaultRandom(),
  planId:          uuid('plan_id').notNull().references(() => trainingPlans.id),
  userId:          uuid('user_id').notNull().references(() => users.id),
  scheduledDate:   date('scheduled_date').notNull(),
  discipline:      varchar('discipline', { length: 10 }).notNull(), // swim|bike|run|brick
  title:           varchar('title', { length: 255 }),
  description:     text('description'),                // workout estruturado (texto completo)
  structure:       jsonb('structure'),                 // blocos: { warmup, sets, cooldown }
  durationMin:     integer('duration_min'),
  distanceM:       integer('distance_m'),
  intensityZone:   varchar('intensity_zone', { length: 10 }),
  tssEstimate:     numeric('tss_estimate', { precision: 6, scale: 1 }),
  sentToWatch:     boolean('sent_to_watch').default(false),
  sentAt:          timestamp('sent_at'),
  intervalsWorkoutId: varchar('intervals_workout_id', { length: 100 }), // ID no intervals.icu
  week:            integer('week'),
  phase:           varchar('phase', { length: 20 }),
  createdAt:       timestamp('created_at').defaultNow(),
});

// ── ATIVIDADES EXECUTADAS ─────────────────────────────────────

export const activities = pgTable('activities', {
  id:               uuid('id').primaryKey().defaultRandom(),
  userId:           uuid('user_id').notNull().references(() => users.id),
  plannedWorkoutId: uuid('planned_workout_id').references(() => plannedWorkouts.id),
  externalId:       varchar('external_id', { length: 100 }),      // ID Strava ou intervals.icu
  source:           varchar('source', { length: 20 }).notNull(),  // strava|intervals_icu|manual
  discipline:       varchar('discipline', { length: 10 }).notNull(),
  title:            varchar('title', { length: 255 }),
  startedAt:        timestamp('started_at').notNull(),
  durationSec:      integer('duration_sec'),
  distanceM:        numeric('distance_m', { precision: 10, scale: 2 }),
  avgHr:            integer('avg_hr'),
  maxHr:            integer('max_hr'),
  avgPowerW:        integer('avg_power_w'),
  elevationM:       numeric('elevation_m', { precision: 8, scale: 2 }),
  calories:         integer('calories'),
  latStart:         numeric('lat_start', { precision: 10, scale: 7 }),
  lonStart:         numeric('lon_start', { precision: 10, scale: 7 }),
  // clima (preenchido por job assíncrono via OpenWeatherMap)
  tempStartC:       numeric('temp_start_c', { precision: 5, scale: 2 }),
  tempAvgC:         numeric('temp_avg_c', { precision: 5, scale: 2 }),
  humidityPct:      integer('humidity_pct'),
  windMps:          numeric('wind_mps', { precision: 5, scale: 2 }),
  // eventos adversos
  adverseEvents:    text('adverse_events').array(),   // gi|cramps|dizziness|nausea
  perceivedEffort:  integer('perceived_effort'),       // 1-10
  notes:            text('notes'),
  rawData:          jsonb('raw_data'),                 // payload original do provider
  createdAt:        timestamp('created_at').defaultNow(),
  updatedAt:        timestamp('updated_at').defaultNow(),
});

// ── NUTRIÇÃO PRESCRITA ────────────────────────────────────────

export const nutritionProtocols = pgTable('nutrition_protocols', {
  id:               uuid('id').primaryKey().defaultRandom(),
  plannedWorkoutId: uuid('planned_workout_id').notNull()
                      .references(() => plannedWorkouts.id),
  items:            jsonb('items').notNull(),
  // exemplo de items:
  // [{ phase: 'pre', minuteOffset: -45, product: '1 banana', carbsG: 25, sodiumMg: 0, kcal: 100 },
  //  { phase: 'during', minuteOffset: 45, product: '1 gel', carbsG: 25, caffeineM: 50, kcal: 100 }]
  totalCarbsG:      numeric('total_carbs_g', { precision: 8, scale: 2 }),
  totalSodiumMg:    numeric('total_sodium_mg', { precision: 8, scale: 2 }),
  totalCaffeineMg:  numeric('total_caffeine_mg', { precision: 6, scale: 2 }),
  totalKcal:        integer('total_kcal'),
  createdAt:        timestamp('created_at').defaultNow(),
});

// ── NUTRIÇÃO REGISTRADA ───────────────────────────────────────

export const nutritionLogs = pgTable('nutrition_logs', {
  id:           uuid('id').primaryKey().defaultRandom(),
  activityId:   uuid('activity_id').notNull().references(() => activities.id),
  userId:       uuid('user_id').notNull().references(() => users.id),
  totalCarbsG:  numeric('total_carbs_g', { precision: 8, scale: 2 }),
  totalSodiumMg: numeric('total_sodium_mg', { precision: 8, scale: 2 }),
  totalCaffeineMg: numeric('total_caffeine_mg', { precision: 6, scale: 2 }),
  totalKcal:    integer('total_kcal'),
  createdAt:    timestamp('created_at').defaultNow(),
  updatedAt:    timestamp('updated_at').defaultNow(),
});

export const nutritionItems = pgTable('nutrition_items', {
  id:             uuid('id').primaryKey().defaultRandom(),
  logId:          uuid('log_id').notNull().references(() => nutritionLogs.id),
  phase:          varchar('phase', { length: 10 }).notNull(), // pre|during|post
  minuteOffset:   integer('minute_offset'),                  // minutos do início do treino
  productName:    varchar('product_name', { length: 255 }).notNull(),
  brand:          varchar('brand', { length: 100 }),
  quantity:       numeric('quantity', { precision: 6, scale: 2 }),
  unit:           varchar('unit', { length: 20 }),           // g|ml|unit
  carbsG:         numeric('carbs_g', { precision: 6, scale: 2 }),
  sodiumMg:       numeric('sodium_mg', { precision: 6, scale: 2 }),
  caffeineMg:     numeric('caffeine_mg', { precision: 6, scale: 2 }),
  kcal:           integer('kcal'),
  source:         varchar('source', { length: 20 }).default('manual'), // manual|preset|ocr|nlp
  confidence:     numeric('confidence', { precision: 3, scale: 2 }),   // 0-1 (fase 2)
  createdAt:      timestamp('created_at').defaultNow(),
});

// ── PRESETS DE SUPLEMENTAÇÃO ──────────────────────────────────

export const supplementPresets = pgTable('supplement_presets', {
  id:          uuid('id').primaryKey().defaultRandom(),
  userId:      uuid('user_id').notNull().references(() => users.id),
  name:        varchar('name', { length: 100 }).notNull(),  // ex: "Gel race day"
  items:       jsonb('items').notNull(),                    // lista de itens (mesmo schema de nutrition_items)
  createdAt:   timestamp('created_at').defaultNow(),
});

// ── INSIGHTS DE IA ────────────────────────────────────────────

export const aiInsights = pgTable('ai_insights', {
  id:           uuid('id').primaryKey().defaultRandom(),
  activityId:   uuid('activity_id').notNull().references(() => activities.id),
  category:     varchar('category', { length: 30 }).notNull(), // carbs|sodium|caffeine|hydration|performance
  insight:      text('insight').notNull(),
  recommendation: text('recommendation'),
  score:        numeric('score', { precision: 3, scale: 2 }),  // 0-1
  alertLevel:   varchar('alert_level', { length: 10 }),        // ok|warn|alert
  createdAt:    timestamp('created_at').defaultNow(),
});

// ── CHECKINS SEMANAIS ─────────────────────────────────────────

export const weeklyCheckins = pgTable('weekly_checkins', {
  id:               uuid('id').primaryKey().defaultRandom(),
  userId:           uuid('user_id').notNull().references(() => users.id),
  planId:           uuid('plan_id').references(() => trainingPlans.id),
  weekNumber:       integer('week_number').notNull(),
  completedWorkouts: integer('completed_workouts'),
  totalPlanned:     integer('total_planned'),
  energyLevel:      integer('energy_level'),   // 1-5
  sleepQuality:     integer('sleep_quality'),  // 1-5
  muscleSoreness:   integer('muscle_soreness'), // 1-5
  notes:            text('notes'),
  planAdapted:      boolean('plan_adapted').default(false),
  createdAt:        timestamp('created_at').defaultNow(),
});

// ── LOGS DE SINCRONIZAÇÃO ─────────────────────────────────────

export const syncLogs = pgTable('sync_logs', {
  id:            uuid('id').primaryKey().defaultRandom(),
  userId:        uuid('user_id').references(() => users.id),
  provider:      varchar('provider', { length: 30 }).notNull(),
  correlationId: uuid('correlation_id').defaultRandom(),
  outcome:       varchar('outcome', { length: 10 }).notNull(), // success|failure
  activitiesSynced: integer('activities_synced').default(0),
  errorDetails:  text('error_details'),
  durationMs:    integer('duration_ms'),
  createdAt:     timestamp('created_at').defaultNow(),
});

// ── MÓDULO TREINADOR (fase 3) ─────────────────────────────────

export const coachAthletes = pgTable('coach_athletes', {
  id:          uuid('id').primaryKey().defaultRandom(),
  coachId:     uuid('coach_id').notNull().references(() => users.id),
  athleteId:   uuid('athlete_id').notNull().references(() => users.id),
  status:      varchar('status', { length: 20 }).default('pending'), // pending|active|revoked
  inviteCode:  varchar('invite_code', { length: 20 }),
  createdAt:   timestamp('created_at').defaultNow(),
  updatedAt:   timestamp('updated_at').defaultNow(),
});

export const activityComments = pgTable('activity_comments', {
  id:         uuid('id').primaryKey().defaultRandom(),
  activityId: uuid('activity_id').notNull().references(() => activities.id),
  authorId:   uuid('author_id').notNull().references(() => users.id), // coach
  text:       text('text').notNull(),
  createdAt:  timestamp('created_at').defaultNow(),
});
```

### 3.3 Índices importantes

```sql
CREATE INDEX idx_planned_workouts_plan_date   ON planned_workouts(plan_id, scheduled_date);
CREATE INDEX idx_activities_user_started      ON activities(user_id, started_at DESC);
CREATE INDEX idx_activities_external_id       ON activities(external_id, source);
CREATE INDEX idx_nutrition_items_log          ON nutrition_items(log_id);
CREATE INDEX idx_ai_insights_activity         ON ai_insights(activity_id);
CREATE INDEX idx_integrations_user_provider   ON integrations(user_id, provider);
CREATE INDEX idx_sync_logs_created            ON sync_logs(created_at DESC);
```

---

## 4. Stack Detalhada

### 4.1 Frontend (apps/web)

| Lib | Versão | Uso |
|---|---|---|
| Next.js | 15.x | Framework React, App Router, API routes |
| React | 19.x | UI |
| TypeScript | 5.x | Tipagem estática |
| Tailwind CSS | 4.x | Estilos utilitários |
| shadcn/ui | latest | Componentes base (Radix UI) |
| Zustand | 5.x | Estado global do cliente (auth, tema) |
| TanStack Query | 5.x | Cache e sincronização de dados do servidor |
| @ducanh2912/next-pwa | latest | Service worker, manifesto, offline |
| Recharts | 2.x | Gráficos (dashboard, tendências) |
| date-fns | 3.x | Formatação de datas |
| zod | 3.x | Validação de formulários |
| react-hook-form | 7.x | Formulários (onboarding) |

**PWA:** manifest.json + service worker com cache de assets estáticos. Push notifications via Web Push API (para "treino enviado ao relógio").

### 4.2 Backend (apps/api)

| Lib | Versão | Uso |
|---|---|---|
| Node.js | 22.x LTS | Runtime |
| Fastify | 5.x | HTTP server |
| TypeScript | 5.x | Tipagem |
| Drizzle ORM | 0.x | Queries type-safe |
| @anthropic-ai/sdk | latest | Claude API (planos + chat) |
| node-cron | 3.x | Jobs agendados |
| zod | 3.x | Validação de payloads |
| jose | 5.x | JWT (sign + verify) |
| node-fetch / undici | built-in | HTTP calls para APIs externas |
| pino | 9.x | Logging estruturado (JSON) |

### 4.3 Autenticação

Fluxo simples com JWT próprio (sem Supabase Auth para manter controle):

```
1. Cadastro/Login → POST /auth/register ou /auth/login
   Backend cria JWT (24h) + refresh token (30d, armazenado em DB)
   Frontend armazena JWT no memory (Zustand) + refresh token em httpOnly cookie

2. OAuth Strava → GET /integrations/strava/connect
   Redireciona para Strava → callback → salva tokens criptografados

3. OAuth intervals.icu → GET /integrations/intervals/connect
   Mesmo fluxo
```

---

## 5. Módulo de IA (Claude API)

### 5.1 Uso por feature

| Feature | Modelo | Tokens estimados | Frequência |
|---|---|---|---|
| Geração do plano completo | claude-sonnet-4-5 | ~8k output | 1x por atleta |
| Adaptação de plano (checkin) | claude-sonnet-4-5 | ~3k output | Semanal |
| Chat natural language | claude-haiku-4-5 | ~500 output | Ad hoc |
| Protocolo nutricional por treino | claude-haiku-4-5 | ~1k output | Por treino |
| Insight nutricional por atividade | claude-haiku-4-5 | ~500 output | Por atividade |

### 5.2 Estrutura de prompts

Os prompts ficam em `apps/api/src/ai/prompts/`:

```
prompts/
├── generate-plan.ts       ← prompt principal + schema de output
├── adapt-plan.ts          ← prompt de adaptação pós-checkin
├── chat-adaptation.ts     ← mensagem natural → mudança no plano
├── nutrition-protocol.ts  ← protocolo nutricional por treino
└── nutrition-insight.ts   ← análise do que foi consumido
```

Todos usam **Structured Output** (response_format JSON Schema) para garantir parsing confiável.

### 5.3 Exemplo de output esperado (generate-plan)

```json
{
  "phases": [
    {
      "name": "base",
      "startWeek": 1,
      "endWeek": 4,
      "weeks": [
        {
          "weekNumber": 1,
          "workouts": [
            {
              "scheduledDate": "2026-03-02",
              "discipline": "run",
              "title": "Corrida aeróbica leve",
              "durationMin": 40,
              "intensityZone": "Z2",
              "structure": {
                "warmup": "10min caminhada + trote leve Z1",
                "main": "25min Z2 pace controlado",
                "cooldown": "5min caminhada"
              },
              "tssEstimate": 42
            }
          ]
        }
      ]
    }
  ]
}
```

---

## 6. Jobs e Sincronização

### 6.1 Jobs agendados

```typescript
// apps/api/src/jobs/strava-sync.job.ts
// Executa a cada 2 horas: sincroniza atividades de todos os usuários com Strava conectado

// apps/api/src/jobs/token-refresh.job.ts
// Executa diariamente às 06:00: renova tokens expirados (Strava + intervals.icu)
```

### 6.2 Fluxo de sincronização Strava

```
cron (a cada 2h)
  → busca users com integração Strava ativa
  → para cada user: GET /athlete/activities?after={lastSyncTimestamp}
  → para cada atividade nova:
      - upsert em activities (deduplication via external_id)
      - busca clima histórico (lat/lon + data) → atualiza activity
      - dispara geração de insight de IA (async, não bloqueia)
  → atualiza integrations.last_sync_at
  → insere em sync_logs
```

### 6.3 Fluxo de envio de treino para o relógio

```
Endura agenda treino → POST /api/intervals/workouts
  → intervals.icu aceita → retorna workout_id
  → update planned_workouts SET sent_to_watch=true, intervals_workout_id=?
  → enviar push notification ao usuário
```

---

## 7. API Endpoints

### Auth
```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/logout
```

### Onboarding
```
POST /api/athlete/profile          ← salva perfil completo do onboarding
GET  /api/athlete/profile
PUT  /api/athlete/profile
POST /api/athlete/race-goal        ← define prova alvo
```

### Plano de treino
```
POST /api/plan/generate            ← dispara geração do plano via Claude
GET  /api/plan                     ← plano ativo com semana atual
GET  /api/plan/week/:weekNumber
GET  /api/plan/workout/:id         ← treino individual com protocolo nutricional
POST /api/plan/send-to-watch/:id   ← envia treino ao intervals.icu
POST /api/plan/checkin             ← checkin semanal → dispara adaptação
POST /api/plan/chat                ← chat natural language → adapta plano
```

### Atividades
```
GET  /api/activities               ← lista paginada (filtros: type, period)
GET  /api/activities/:id
POST /api/activities/sync          ← sync manual
```

### Nutrição
```
GET  /api/nutrition/log/:activityId
POST /api/nutrition/log/:activityId/items
PUT  /api/nutrition/log/:activityId/items/:itemId
DEL  /api/nutrition/log/:activityId/items/:itemId
GET  /api/nutrition/presets
POST /api/nutrition/presets
GET  /api/nutrition/shopping-list  ← lista de compras da semana
```

### Integrações
```
GET  /api/integrations/strava/connect       ← inicia OAuth
GET  /api/integrations/strava/callback      ← callback OAuth (chamado pelo Strava)
DEL  /api/integrations/strava/disconnect
GET  /api/integrations/strava/status
POST /api/integrations/strava/sync          ← sync manual

GET  /api/integrations/intervals/connect
GET  /api/integrations/intervals/callback
DEL  /api/integrations/intervals/disconnect
POST /api/integrations/intervals/webhook    ← webhook do intervals.icu
```

### Dashboard
```
GET  /api/dashboard/summary        ← visão semanal: TSS, volume, countdown
GET  /api/dashboard/insights       ← insights recentes com alertas
```

---

## 8. Segurança

| Controle | Implementação |
|---|---|
| Autenticação | JWT com RS256 (par de chaves gerado na init) |
| Tokens OAuth | Criptografados com AES-256-GCM antes de salvar no banco |
| CSRF (OAuth) | `state` parameter validado no callback |
| Rate limiting | Fastify rate-limit plugin por IP + por user |
| Logs | pino com mascaramento de tokens/códigos (`redact` config) |
| Correlation ID | UUID injetado em todas as requests externas |
| Webhook validation | intervals.icu: verificação de assinatura HMAC-SHA256 |
| Refresh tokens | Rotação a cada uso (rotate on use) |
| Row Level Security | Habilitado no Supabase para todas as tabelas |

---

## 9. Deploy e CI/CD

### 9.1 Ambientes

| Ambiente | Branch | URL |
|---|---|---|
| Development | local | localhost:3000 (web), localhost:8080 (api) |
| Preview | PRs | Vercel preview (web) |
| Production | main | endura.app (web), api.endura.app (api) |

### 9.2 GitHub Actions

```yaml
# .github/workflows/ci.yml
on: push (main, develop) + pull_request

jobs:
  - typecheck: tsc --noEmit (web + api)
  - lint: eslint
  - test: vitest (web) + node:test (api)
  - build: next build (web) + tsc (api)
  - deploy: Vercel CLI (web) + Render webhook (api) — apenas em main
```

### 9.3 Variáveis de ambiente

```bash
# apps/api/.env
DATABASE_URL=postgresql://...
JWT_PRIVATE_KEY=...
JWT_PUBLIC_KEY=...
ENCRYPTION_KEY=...                      # AES-256 para tokens OAuth

ANTHROPIC_API_KEY=...
STRAVA_CLIENT_ID=...
STRAVA_CLIENT_SECRET=...
INTERVALS_CLIENT_ID=...
INTERVALS_CLIENT_SECRET=...
OPENWEATHER_API_KEY=...
INTERVALS_WEBHOOK_SECRET=...

# apps/web/.env.local
NEXT_PUBLIC_API_URL=https://api.endura.app
```

---

## 10. Padrões de Código

- **Commits:** Conventional Commits em português (`feat:`, `fix:`, `refactor:`, `docs:`)
- **Branches:** `main` (produção) → `develop` → `feature/<nome>` / `fix/<nome>`
- **Formatação:** Prettier + ESLint (config compartilhada em `packages/config-eslint`)
- **Módulos no Fastify:** cada módulo é um plugin Fastify registrado com prefixo de rota
- **Validação:** Zod em 100% dos endpoints (request + response)
- **Erros:** Erro tipado com código (`ERR_PLAN_NOT_FOUND`), mensagem amigável e HTTP status correto
- **Logs:** structured JSON via pino — nunca `console.log` em produção

---

*Endura — Especificações Técnicas*
*Versão 1.0 | Fevereiro 2026*
