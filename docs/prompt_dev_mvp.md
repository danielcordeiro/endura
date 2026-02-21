# Prompt — Implementação Completa do MVP Endura

## Missão

Implemente do zero o MVP do **Endura**, uma plataforma SaaS de performance para triatletas. Você deve seguir rigorosamente as decisões de arquitetura, design e produto já definidas. Toda a documentação necessária está na pasta `docs/` deste repositório — leia cada arquivo antes de implementar o módulo correspondente.

**Antes de começar:** leia os seguintes arquivos na íntegra:
- `docs/Endura_MVP.md` — visão do produto, funcionalidades, regras
- `docs/tecnica/TECHNICAL_SPECS.md` — stack, schema do banco, endpoints
- `docs/projeto/layout_design_system.md` — tokens de design, componentes, tipografia
- `docs/projeto/layout_frontend.md` — wireframes de todas as telas do MVP
- `docs/projeto/regras_negocio.md` — regras e restrições de negócio
- `docs/projeto/integracao.md` — detalhes das integrações externas

---

## Decisões não negociáveis

Estas escolhas já foram feitas. Não proponha alternativas — apenas implemente:

| Decisão | Escolha |
|---|---|
| Monorepo | pnpm workspaces |
| Frontend | Next.js 15 (App Router) + TypeScript |
| Estilo | Tailwind CSS 4 + shadcn/ui |
| Estado cliente | Zustand 5 |
| Dados servidor | TanStack Query 5 |
| PWA | @ducanh2912/next-pwa |
| Backend | Node.js 22 + Fastify 5 + TypeScript |
| ORM | Drizzle ORM |
| Banco | Supabase (PostgreSQL) |
| LLM | Claude API via @anthropic-ai/sdk (claude-sonnet-4-5 / claude-haiku-4-5) |
| Jobs | node-cron |
| Validação | Zod (frontend e backend) |
| Logging | pino |
| Deploy frontend | Vercel |
| Deploy backend | Render |

---

## Estrutura de pastas a criar

```
endura/
├── package.json               ← pnpm workspace root
├── pnpm-workspace.yaml
├── .env.example               ← todas as variáveis necessárias documentadas
├── apps/
│   ├── web/                   ← Next.js 15
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   │   ├── login/
│   │   │   │   └── onboarding/
│   │   │   ├── (app)/
│   │   │   │   ├── dashboard/
│   │   │   │   ├── treino/[id]/
│   │   │   │   ├── atividades/
│   │   │   │   ├── atividades/[id]/
│   │   │   │   ├── nutricao/
│   │   │   │   └── configuracoes/
│   │   │   └── api/
│   │   │       ├── auth/strava/callback/
│   │   │       └── auth/intervals/callback/
│   │   ├── components/
│   │   │   ├── ui/            ← shadcn/ui base
│   │   │   ├── training/
│   │   │   ├── nutrition/
│   │   │   └── dashboard/
│   │   ├── lib/
│   │   ├── stores/
│   │   └── public/
│   │       └── manifest.json  ← PWA manifest
│   │
│   └── api/                   ← Fastify
│       ├── src/
│       │   ├── modules/
│       │   │   ├── auth/
│       │   │   ├── athlete/
│       │   │   ├── plan/
│       │   │   ├── training/
│       │   │   ├── activity/
│       │   │   ├── nutrition/
│       │   │   └── integration/
│       │   ├── jobs/
│       │   ├── lib/
│       │   │   ├── db.ts
│       │   │   ├── claude.ts
│       │   │   └── encryption.ts
│       │   └── server.ts
│       └── drizzle/
│           ├── schema.ts
│           └── migrations/
│
└── packages/
    └── types/
        └── index.ts           ← tipos compartilhados
```

---

## Fases de implementação

Execute **nesta ordem exata**. Não avance para a próxima fase sem concluir a atual.

---

### FASE 1 — Setup do Monorepo

**Objetivo:** repositório funcionando com ambos os apps inicializando sem erro.

**Passos:**

1. Crie `package.json` raiz com `pnpm workspaces` apontando para `apps/*` e `packages/*`
2. Crie `pnpm-workspace.yaml`
3. Inicialize `apps/api`:
   - `package.json` com Fastify 5, TypeScript, Drizzle ORM, Zod, pino, node-cron, @anthropic-ai/sdk, jose
   - `tsconfig.json` strict mode
   - `src/server.ts` com Fastify básico respondendo `GET /health → { ok: true }`
4. Inicialize `apps/web`:
   - Next.js 15 via `create-next-app` com TypeScript, Tailwind, App Router
   - Instale: shadcn/ui, Zustand, TanStack Query, @ducanh2912/next-pwa
   - Configure Tailwind com os tokens do design system (ver `layout_design_system.md`)
   - Configure `next.config.ts` com PWA e proxy para `http://localhost:8080`
5. Crie `packages/types/index.ts` com os tipos compartilhados principais
6. Crie `.env.example` com todas as variáveis:
   ```
   # API
   DATABASE_URL=
   JWT_PRIVATE_KEY=
   JWT_PUBLIC_KEY=
   ENCRYPTION_KEY=
   ANTHROPIC_API_KEY=
   STRAVA_CLIENT_ID=
   STRAVA_CLIENT_SECRET=
   INTERVALS_CLIENT_ID=
   INTERVALS_CLIENT_SECRET=
   INTERVALS_WEBHOOK_SECRET=

   # Web
   NEXT_PUBLIC_API_URL=http://localhost:8080
   ```

**Critério de conclusão:** `pnpm dev` (em ambos os apps) sem erros. `GET /health` retorna 200.

---

### FASE 2 — Database: Schema e Migrations

**Objetivo:** banco de dados criado com todas as tabelas do MVP.

**Passos:**

1. Configure `apps/api/src/lib/db.ts` com Drizzle + conexão Supabase via `DATABASE_URL`
2. Crie `apps/api/drizzle/schema.ts` com **exatamente** o schema definido em `TECHNICAL_SPECS.md` seção 3.2, incluindo todas as tabelas:
   - `users`
   - `athlete_profiles`
   - `race_goals`
   - `integrations`
   - `training_plans`
   - `planned_workouts`
   - `activities`
   - `nutrition_protocols`
   - `nutrition_logs`
   - `nutrition_items`
   - `supplement_presets`
   - `ai_insights`
   - `weekly_checkins`
   - `sync_logs`
3. Configure `drizzle.config.ts`
4. Rode `drizzle-kit generate` e `drizzle-kit migrate`
5. Crie os índices definidos em `TECHNICAL_SPECS.md` seção 3.3

**Critério de conclusão:** `drizzle-kit migrate` executa sem erros. Todas as tabelas existem no Supabase.

---

### FASE 3 — API: Autenticação

**Objetivo:** registro, login (e-mail/senha) e OAuth Strava funcionando com JWT.

**Passos:**

1. Crie `apps/api/src/lib/encryption.ts`:
   - `encrypt(text: string): string` — AES-256-GCM
   - `decrypt(ciphertext: string): string`
   - Use `ENCRYPTION_KEY` do `.env`

2. Implemente módulo `auth`:
   - `POST /api/auth/register` — cria usuário, retorna JWT + refresh token
   - `POST /api/auth/login` — autentica, retorna JWT + refresh token
   - `POST /api/auth/refresh` — renova JWT via refresh token (rotação: invalida o anterior)
   - `POST /api/auth/logout` — invalida refresh token
   - JWT: RS256, access token 24h, refresh token 30d armazenado em DB
   - Middleware de autenticação para rotas protegidas

3. Implemente módulo `integration/strava`:
   - `GET /api/integrations/strava/connect` — retorna `{ authUrl }` com state CSRF
   - `GET /api/integrations/strava/callback?code=&state=` — troca code por tokens, salva criptografado, retorna JWT do Endura
   - `GET /api/integrations/strava/status` — retorna status da conexão e última sync
   - `DELETE /api/integrations/strava/disconnect` — remove tokens
   - Os callbacks OAuth são chamados pelo Strava — o frontend recebe via `apps/web/app/api/auth/strava/callback/route.ts` que faz proxy para a API

4. Implemente módulo `integration/intervals`:
   - Mesmo padrão do Strava: connect → callback → status → disconnect
   - `POST /api/integrations/intervals/webhook` — recebe eventos do intervals.icu (verificar assinatura HMAC-SHA256 com `INTERVALS_WEBHOOK_SECRET`)

**Critério de conclusão:** fluxo completo testável via Postman/curl. OAuth Strava redireciona, faz callback e retorna JWT válido.

---

### FASE 4 — API: Onboarding e Perfil

**Objetivo:** endpoints para salvar dados do onboarding.

**Passos:**

1. Módulo `athlete`:
   - `POST /api/athlete/profile` — cria/atualiza `athlete_profiles` (todos os 5 blocos do onboarding)
   - `GET /api/athlete/profile` — retorna perfil completo
   - `PUT /api/athlete/profile` — atualiza campos específicos

2. Módulo `athlete` (race goal):
   - `POST /api/athlete/race-goal` — cria `race_goals`, marca anterior como `active: false`
   - `GET /api/athlete/race-goal` — retorna a prova alvo ativa

**Validação com Zod:** todos os campos devem ser validados. Campos opcionais aceitos como `null`.

**Critério de conclusão:** `POST /api/athlete/profile` persiste todos os campos. `GET` retorna os dados salvos.

---

### FASE 5 — API: Geração do Plano com IA

**Objetivo:** gerar plano de treino completo via Claude API.

**Passos:**

1. Crie `apps/api/src/lib/claude.ts`:
   - Cliente Anthropic SDK configurado
   - Função `generateTrainingPlan(profile, raceGoal): Promise<TrainingPlan>`
   - Função `generateNutritionProtocol(workout, profile): Promise<NutritionProtocol>`
   - Use `claude-sonnet-4-5` para geração do plano (complexo)
   - Use `claude-haiku-4-5` para protocolo nutricional (simples/repetitivo)

2. Crie os prompts em `apps/api/src/modules/plan/prompts/`:
   - `generate-plan.prompt.ts` — recebe perfil do atleta + prova alvo, retorna JSON estruturado com fases, semanas e treinos. Output deve seguir exatamente o schema `planned_workouts`.
   - `nutrition-protocol.prompt.ts` — recebe treino + perfil nutricional, retorna timeline de itens de nutrição

3. Módulo `plan`:
   - `POST /api/plan/generate` — lê perfil + prova alvo, chama Claude, persiste em `training_plans` + `planned_workouts` + `nutrition_protocols`
   - `GET /api/plan` — retorna plano ativo com semana atual expandida
   - `GET /api/plan/week/:weekNumber` — retorna treinos da semana
   - `GET /api/plan/workout/:id` — treino individual com protocolo nutricional completo
   - `POST /api/plan/chat` — recebe mensagem em linguagem natural, adapta o plano via Claude, persiste mudanças

**Importante:** use Structured Output (JSON Schema) nas chamadas ao Claude para garantir parsing confiável. Inclua tratamento de erro se Claude retornar JSON inválido (retry 1× antes de lançar erro).

**Critério de conclusão:** `POST /api/plan/generate` retorna plano de 12+ semanas com treinos estruturados e protocolos nutricionais.

---

### FASE 6 — API: Atividades e Sincronização

**Objetivo:** sincronizar atividades do Strava e salvar no banco.

**Passos:**

1. Módulo `activity`:
   - `GET /api/activities` — lista paginada, filtros: `type`, `period` (7d/30d/90d), `page`, `limit`
   - `GET /api/activities/:id` — detalhe com nutrition_log + nutrition_items

2. Serviço de sincronização Strava (`apps/api/src/modules/integration/strava-sync.service.ts`):
   - `syncUserActivities(userId)`:
     1. Busca token (descriptografa)
     2. Chama `GET https://www.strava.com/api/v3/athlete/activities?after={lastSyncTimestamp}&per_page=50`
     3. Faz upsert em `activities` (deduplication por `external_id + source`)
     4. Atualiza `integrations.last_sync_at`
     5. Insere em `sync_logs` (sucesso ou falha com detalhes)
   - Respeitar rate limit: máximo 80 requisições/15min (buffer de segurança)
   - Retry com backoff exponencial em erros 5xx (max 3 tentativas)
   - Token expirado: refresh automático antes de retornar erro

3. Jobs agendados (`apps/api/src/jobs/`):
   - `strava-sync.job.ts` — `cron('0 */2 * * *')` — roda a cada 2h para todos os usuários com Strava ativo
   - `token-refresh.job.ts` — `cron('0 6 * * *')` — refresh de tokens às 6h

4. Endpoint manual:
   - `POST /api/integrations/strava/sync` — trigger manual de sync para o usuário autenticado

**Critério de conclusão:** após conectar Strava, as atividades dos últimos 30 dias aparecem em `GET /api/activities`.

---

### FASE 7 — API: Envio de Treino para o Relógio

**Objetivo:** enviar treinos planejados para o intervals.icu.

**Passos:**

1. Serviço intervals.icu (`apps/api/src/modules/integration/intervals.service.ts`):
   - `sendWorkout(userId, plannedWorkoutId)`:
     1. Busca `planned_workout` com estrutura completa
     2. Converte para formato intervals.icu (ver documentação da API em https://intervals.icu/api)
     3. `POST https://intervals.icu/api/v1/athlete/{athleteId}/workouts`
     4. Salva `intervals_workout_id` no `planned_workout`
     5. Atualiza `sent_to_watch: true, sent_at: now()`

2. Endpoint:
   - `POST /api/plan/send-to-watch/:id` — chama `sendWorkout`, retorna status

**Critério de conclusão:** `POST /api/plan/send-to-watch/:id` cria workout no intervals.icu da conta conectada.

---

### FASE 8 — API: Nutrição

**Objetivo:** endpoints de registro retroativo de suplementação e presets.

**Passos:**

1. Módulo `nutrition`:
   - `GET /api/nutrition/log/:activityId` — retorna log completo com itens e totais calculados
   - `POST /api/nutrition/log/:activityId/items` — adiciona item ao log (cria o log se não existir)
   - `PUT /api/nutrition/log/:activityId/items/:itemId` — edita item
   - `DELETE /api/nutrition/log/:activityId/items/:itemId` — remove item
   - Após qualquer mutação: recalcular e atualizar os totais em `nutrition_logs`

2. Presets:
   - `GET /api/nutrition/presets` — lista presets do usuário
   - `POST /api/nutrition/presets` — cria preset (nome + array de itens)
   - `DELETE /api/nutrition/presets/:id` — remove preset

3. Lista de compras:
   - `GET /api/nutrition/shopping-list` — consolida protocolos nutricionais da semana atual, agrupa por produto, retorna lista com quantidades

**Critério de conclusão:** adicionar, editar e remover itens de suplementação funciona. Totais são recalculados corretamente.

---

### FASE 9 — API: Dashboard

**Objetivo:** endpoint de sumário para o dashboard do atleta.

**Passos:**

1. Módulo `dashboard`:
   - `GET /api/dashboard/summary` — retorna:
     ```typescript
     {
       raceGoal: { name, date, daysRemaining },
       currentPlan: { phase, weekNumber, percentComplete },
       currentWeek: {
         workoutsPlanned: number,
         workoutsCompleted: number,
         tssEstimate: number,
         volumeHours: number
       },
       todayWorkout: PlannedWorkout | null,
       alerts: Alert[]
     }
     ```
   - Alerts gerados por: integração desconectada, treinos perdidos, taper chegando

**Critério de conclusão:** `GET /api/dashboard/summary` retorna dados coerentes com o estado atual do plano.

---

### FASE 10 — Frontend: Design System e Componentes Base

**Objetivo:** implementar os tokens e componentes do design system antes de qualquer tela.

**Passos:**

1. Configure as CSS variables em `apps/web/app/globals.css` com **exatamente** os tokens definidos em `layout_design_system.md`:
   - Todos os `--bg-*`, `--text-*`, `--primary`, `--swim`, `--bike`, `--run`, `--brick`, `--phase-*`, alertas

2. Configure `tailwind.config.ts` para usar as CSS variables como cores:
   ```ts
   colors: {
     primary: 'var(--primary)',
     'bg-base': 'var(--bg-base)',
     // ... todos os tokens
   }
   ```

3. Adicione as fontes (`Barlow Condensed`, `DM Sans`, `JetBrains Mono`) via next/font

4. Implemente os componentes base em `apps/web/components/ui/` (via shadcn/ui + customização):
   - `StatCard` — métrica com label, valor grande e contexto
   - `ActivityRow` — item de lista de atividades
   - `DisciplineBadge` — pílula por modalidade (swim/bike/run/brick)
   - `PhaseTag` — pílula de fase nutricional (pré/durante/pós)
   - `AlertBanner` — banner de alerta com variantes warning/danger/success
   - `BottomSheet` — modal que sobe do fundo com drag handle
   - `NutritionTimeline` — linha do tempo horizontal de protocolos
   - `ProgressRing` — anel SVG animado de progresso

5. Implemente o layout base:
   - `apps/web/app/(app)/layout.tsx` — layout com BottomNav (5 tabs)
   - `apps/web/components/BottomNav.tsx` — navegação inferior

**Critério de conclusão:** Storybook ou página `/dev` mostrando todos os componentes renderizados corretamente com as cores e tipografias do design system.

---

### FASE 11 — Frontend: Autenticação e Onboarding

**Objetivo:** fluxo completo de cadastro e onboarding em 5 passos.

**Referência visual:** `layout_frontend.md` seções 1 e 2.

**Passos:**

1. Implemente `apps/web/stores/authStore.ts` (Zustand):
   - Estado: `user`, `token`, `isAuthenticated`, `isLoading`
   - Ações: `login`, `loginWithStrava`, `logout`, `refreshToken`
   - Token JWT em memória; refresh token em httpOnly cookie via API route Next.js

2. Tela de login (`app/(auth)/login/page.tsx`):
   - Form e-mail + senha
   - Botão "Entrar com Strava" (cor `#FC4C02`)
   - Redirecionamento pós-login para `/dashboard` ou `/onboarding` (se sem perfil)

3. Onboarding multipassos (`app/(auth)/onboarding/`):
   - Step 1: Perfil atlético (nível, ponto fraco, disponibilidade, equipamentos)
   - Step 2: Prova alvo (distância, data, objetivo)
   - Step 3: Dados fisiológicos (peso, altura, FC máx, FTP, pace)
   - Step 4: Perfil nutricional (restrições, produtos, sensibilidades)
   - Step 5: Integrações (botões OAuth para intervals.icu e Strava)
   - Progress dots no topo, animação de slide entre steps
   - Persistência de dados entre steps em estado local (não salvar parcialmente)
   - No submit do último step: `POST /api/athlete/profile` + `POST /api/athlete/race-goal` + `POST /api/plan/generate` (loading state enquanto IA gera o plano)

**Critério de conclusão:** usuário completa onboarding, plano é gerado, redireciona para dashboard.

---

### FASE 12 — Frontend: Dashboard

**Objetivo:** tela principal com treino do dia e visão semanal.

**Referência visual:** `layout_frontend.md` seção 3.

**Passos:**

1. `app/(app)/dashboard/page.tsx`:
   - Fetch `GET /api/dashboard/summary` via TanStack Query (cache 5min)
   - Saudação dinâmica por horário do dia
   - Contador regressivo para prova (calcular `daysRemaining`)
   - Card "Treino de Hoje" com estrutura resumida e botão "Enviar ao relógio"
   - Stat Cards em grid 2×2 (TSS, treinos, volume, consistência)
   - Alert Banners para alertas do plano
   - Animação de entrada stagger nos cards (CSS animation-delay)

2. Mutation "Enviar ao relógio":
   - `POST /api/plan/send-to-watch/:id`
   - Estados do botão: default → loading → success / error
   - Toast de confirmação: "Treino enviado para o relógio"

**Critério de conclusão:** dashboard carrega dados reais, contador regressivo correto, botão de envio funciona.

---

### FASE 13 — Frontend: Treino do Dia

**Objetivo:** tela com estrutura completa do treino e protocolo nutricional.

**Referência visual:** `layout_frontend.md` seção 4.

**Passos:**

1. `app/(app)/treino/[id]/page.tsx`:
   - Fetch `GET /api/plan/workout/:id`
   - Discipline Badge + título + data
   - Stat row: duração / distância / zona
   - Seções colapsáveis: Aquecimento / Principal / Desaquecimento
   - `NutritionTimeline` com itens do protocolo
   - "Ver protocolo completo" expande a timeline vertical detalhada
   - Botão "Enviar ao relógio" (mesmo da dashboard)
   - Botão "Marcar como concluído" (visível após horário do treino)

**Critério de conclusão:** treino exibe estrutura em blocos e timeline nutricional corretamente.

---

### FASE 14 — Frontend: Lista de Atividades e Detalhe

**Objetivo:** histórico de atividades sincronizadas com registro de suplementação.

**Referência visual:** `layout_frontend.md` seções 5, 6 e 7.

**Passos:**

1. `app/(app)/atividades/page.tsx`:
   - Fetch `GET /api/activities` com paginação (infinite scroll via `useInfiniteQuery`)
   - Filtros: período (7d/30d/90d) + disciplina
   - Agrupamento por mês com sticky headers
   - `ActivityRow` com status de nutrição
   - Pull-to-refresh (revalida a query)
   - Swipe left revela ação rápida "Adicionar nutrição"
   - Botão "Sincronizar manualmente" → `POST /api/integrations/strava/sync`

2. `app/(app)/atividades/[id]/page.tsx`:
   - Fetch `GET /api/activities/:id`
   - Stats row + lista de itens por fase
   - Totais nutricionais (carbo, sódio, cafeína, kcal)
   - Botão "+ Adicionar consumo" abre `BottomSheet`

3. `BottomSheet` de registro de suplementação (`components/nutrition/LogSupplementSheet.tsx`):
   - Toggle de fase (PRÉ / DURANTE / PÓS) com cores correspondentes
   - Campo produto com autocomplete de presets (`GET /api/nutrition/presets`)
   - Campos nutricionais (opcionais, colapsáveis)
   - Campo de horário no treino (`+XXmin`)
   - Mutation `POST /api/nutrition/log/:activityId/items`
   - Invalida query do detalhe após sucesso

4. Evento adverso:
   - Link "Relatar evento adverso" abre mini bottom sheet com checkboxes
   - Mutation `PUT /api/activities/:id` salvando `adverseEvents` array

**Critério de conclusão:** adicionar, listar e remover itens de suplementação funciona end-to-end.

---

### FASE 15 — Frontend: Configurações e Integrações

**Objetivo:** tela de perfil, status de integrações e sync manual.

**Referência visual:** `layout_frontend.md` seção 8.

**Passos:**

1. `app/(app)/configuracoes/page.tsx`:
   - Exibe perfil do usuário (nome, e-mail)
   - Card da prova alvo com countdown
   - Cards de integração (Strava, intervals.icu) com status, última sync, botão sync manual
   - Links para editar perfil atlético, alterar senha
   - Botão "Sair" com confirmação

2. Status de integração em tempo real:
   - Polling `GET /api/integrations/strava/status` a cada 30s enquanto status = "syncing"
   - Indicador visual de sync em andamento (spinner no card)

**Critério de conclusão:** tela exibe status correto das integrações. Sync manual dispara e atualiza o status.

---

### FASE 16 — PWA: Manifesto e Service Worker

**Objetivo:** app instalável e funcional offline (telas básicas).

**Passos:**

1. Crie `apps/web/public/manifest.json`:
   ```json
   {
     "name": "Endura",
     "short_name": "Endura",
     "description": "Performance para triatletas",
     "start_url": "/dashboard",
     "display": "standalone",
     "background_color": "#090B10",
     "theme_color": "#00F5C4",
     "icons": [
       { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
       { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
     ]
   }
   ```

2. Configure `@ducanh2912/next-pwa` no `next.config.ts`:
   - Cache de assets estáticos (CSS, JS, fontes)
   - Cache de páginas visitadas (stale-while-revalidate)
   - Fallback offline para `/dashboard` (página cacheada)

3. Crie ícones `icon-192.png` e `icon-512.png` (pode usar um placeholder simples — logotipo ENDURA em fundo `#090B10` com texto `#00F5C4`)

**Critério de conclusão:** Lighthouse PWA score ≥ 90. App aparece como "instalável" no Chrome mobile.

---

## Convenções obrigatórias

### Código

- **TypeScript strict** em todos os arquivos. Sem `any` explícito.
- **Zod** valida 100% dos inputs de API (request body, query params, path params).
- **Erros tipados:** toda resposta de erro segue `{ code: string, message: string, status: number }`.
- **Sem `console.log`** em produção — use `pino` no backend, `console.error` apenas no frontend para erros reais.
- **Async/await** sempre — sem `.then()` chains.

### API

- Todos os endpoints retornam `Content-Type: application/json`.
- Respostas de sucesso: `{ data: T }` ou `{ data: T, meta: { page, total } }` para listas.
- HTTP status corretos: `200 OK`, `201 Created`, `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `422 Unprocessable Entity`, `500 Internal Server Error`.
- Autenticação via `Authorization: Bearer <jwt>` em todas as rotas protegidas.

### Commits

- Conventional Commits em português
- Exemplos: `feat: implementa geração de plano via Claude API`, `fix: corrige deduplicação de atividades Strava`, `refactor: extrai lógica de sync para serviço próprio`
- Um commit por fase concluída (mínimo)

### Segurança

- Tokens OAuth **nunca** aparecem em logs — use `pino` `redact` config.
- `ENCRYPTION_KEY` deve ter 32 bytes (256 bits) — valide no startup.
- State CSRF no OAuth: gere UUID, salve em cache/cookie, valide no callback.
- Refresh tokens: rotação a cada uso. Refresh token antigo é invalidado imediatamente.

---

## Variáveis de ambiente necessárias para desenvolvimento

Crie `.env` com os valores reais (não commitar):

```bash
# Database (Supabase)
DATABASE_URL=postgresql://postgres:[password]@[host]:5432/postgres

# JWT (gerar par RS256: openssl genrsa 2048 para private, extrair public)
JWT_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n..."
JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n..."

# Criptografia tokens OAuth (32 bytes hex: openssl rand -hex 32)
ENCRYPTION_KEY=

# IA
ANTHROPIC_API_KEY=

# Strava (criar app em https://www.strava.com/settings/api)
STRAVA_CLIENT_ID=
STRAVA_CLIENT_SECRET=
STRAVA_REDIRECT_URI=http://localhost:3000/api/auth/strava/callback

# intervals.icu (criar API key em https://intervals.icu/settings)
INTERVALS_CLIENT_ID=
INTERVALS_CLIENT_SECRET=
INTERVALS_REDIRECT_URI=http://localhost:3000/api/auth/intervals/callback
INTERVALS_WEBHOOK_SECRET=
```

---

## Critério final de aceitação do MVP

O MVP está completo quando:

- [ ] Usuário cria conta e completa onboarding em < 5 minutos
- [ ] IA gera plano de treino personalizado com periodização correta
- [ ] Treino do dia aparece no dashboard com protocolo nutricional
- [ ] Botão "Enviar ao relógio" cria workout no intervals.icu
- [ ] Strava sincroniza atividades automaticamente (a cada 2h) e manualmente
- [ ] Usuário registra suplementação manualmente em uma atividade
- [ ] Totais nutricionais calculados corretamente por atividade
- [ ] App é instalável como PWA no mobile
- [ ] Todos os endpoints retornam erro adequado para input inválido
- [ ] Nenhum token ou credencial aparece em logs

---

*Leia toda a documentação em `docs/` antes de implementar. Em caso de conflito entre documentos, `TECHNICAL_SPECS.md` prevalece para decisões técnicas e `Endura_MVP.md` prevalece para decisões de produto.*
