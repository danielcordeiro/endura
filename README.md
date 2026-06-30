# Endura

Plataforma de performance para triatletas — planejamento e documentação de produto.

## Pré-requisitos

- **Node.js** >= 20
- **pnpm** >= 9 (`npm install -g pnpm`)
- **PostgreSQL** (Supabase ou local)

## Setup Local

```bash
# 1. Instalar dependências
pnpm install

# 2. Configurar variáveis de ambiente
cp .env.example apps/api/.env        # editar com suas credenciais
echo "NEXT_PUBLIC_API_URL=http://localhost:8080" > apps/web/.env.local

# 3. Gerar chaves JWT (RS256)
openssl genrsa -out /tmp/private.pem 2048
openssl rsa -in /tmp/private.pem -pubout -out /tmp/public.pem
# Copiar conteúdo para JWT_PRIVATE_KEY e JWT_PUBLIC_KEY no .env
# (usar \n no lugar de quebras de linha)

# 4. Gerar chave de criptografia (AES-256)
openssl rand -hex 32
# Copiar para ENCRYPTION_KEY no .env

# 5. Criar tabelas no banco
pnpm --filter @endura/api db:generate
pnpm --filter @endura/api db:migrate

# 6. Rodar tudo (API + Web)
pnpm dev
```

### Rodando separadamente

```bash
# API (porta 8080)
pnpm dev:api

# Web (porta 3000)
pnpm dev:web

# Drizzle Studio (visualizar banco)
pnpm --filter @endura/api db:studio
```

### Variáveis de ambiente

| Variável | Obrigatória | Onde |
|---|---|---|
| `DATABASE_URL` | Sim | `apps/api/.env` |
| `JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY` | Sim | `apps/api/.env` |
| `ENCRYPTION_KEY` | Sim | `apps/api/.env` |
| `ANTHROPIC_API_KEY` | Não* | `apps/api/.env` |
| `STRAVA_CLIENT_ID` / `SECRET` | Não* | `apps/api/.env` |
| `INTERVALS_CLIENT_ID` / `SECRET` | Não* | `apps/api/.env` |
| `NEXT_PUBLIC_API_URL` | Sim | `apps/web/.env.local` |

*\*O servidor roda sem essas chaves, mas as features correspondentes (IA, Strava, intervals.icu) ficam indisponíveis.*

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js 15, Tailwind CSS 4, Zustand 5, TanStack Query 5 |
| Backend | Fastify 5, Drizzle ORM, Zod, node-cron |
| Banco | Supabase (PostgreSQL) |
| IA | Claude API (Anthropic) + **servidor MCP** (`@endura/mcp`, stdio) |
| Monorepo | pnpm workspaces |

## Performance Dashboard

Dashboard completo de performance inspirado em TrainingPeaks, WHOOP, Oura e Garmin Connect.

### Funcionalidades

| Feature | Descricao |
|---|---|
| **PMC Chart** | Grafico CTL/ATL/TSB (Performance Management Chart) com 30/60/90 dias |
| **AI Training Mentor** | Recomenda intensidade do dia (intenso/moderado/leve/descanso) com check-in subjetivo |
| **Race Predictor IM 70.3** | Previsao de splits swim/bike/run com ajuste de altimetria (180 dias de dados) |
| **Prova Alvo** | Cadastro de prova com countdown, prontidao e progresso do plano |
| **Fadiga & Carga** | Monotonia, strain e gauge de fadiga (ATL/CTL ratio) |
| **Benchmarks por Disciplina** | Melhores paces, velocidades e potencia de swim/bike/run |
| **Testes de Fitness** | T30 natacao, FTP 20min bike, Cooper 12min corrida com calculos derivados |
| **Check-in do Atleta** | Sensacao, dor muscular e relato de lesao para recalcular readiness |

### Endpoints de Performance

```
GET  /api/performance/dashboard        — Dashboard completo
GET  /api/performance/pmc?days=90      — Dados PMC
GET  /api/performance/readiness        — Readiness assessment
POST /api/performance/readiness        — Readiness com input subjetivo
GET  /api/performance/race-prediction  — Previsao IM 70.3
GET  /api/performance/target-race      — Prova alvo
GET  /api/fitness-tests                — Testes de fitness
POST /api/fitness-tests                — Registrar teste
```

## Coach via MCP (Claude + API pública)

O Endura expõe uma **API pública** (`/api/v1/public/*`, autenticada por **API Key com scopes**) e um **servidor MCP** em stdio (`packages/mcp-endura`) que a envelopa como _tools_. Conectando o pacote no Claude Code / Claude Desktop, o Claude vira um **treinador completo com memória permanente**: lê a base persistida do atleta, analisa (PMC, wellness, previsão de prova), e **grava de volta** análises, diretrizes, planos e contexto de saúde — de modo que **toda nova sessão recupera tudo do Endura**, de qualquer máquina.

```bash
# Build do pacote MCP e registro no Claude Code
pnpm --filter @endura/mcp build
claude mcp add endura -- node packages/mcp-endura/dist/index.js
#   env: ENDURA_API_URL (default = produção) e ENDURA_API_KEY (key com bundle Coach)
```

**Âncora da sessão:** `endura_get_coach_context` (chamar sempre primeiro) retorna em 1 round-trip o perfil do coach, diretrizes ativas, últimas análises, **contexto de saúde** e o snapshot do atleta.

| Módulo | Tabelas | Tools MCP (exemplos) | Scopes |
|---|---|---|---|
| **Memória do coach** | `coach_profile`, `coach_assessments`, `coach_directives` | `endura_get_coach_context`, `endura_save_assessment`, `endura_save_directive`, `endura_upsert_coach_profile` | `read:coach` / `write:coach` |
| **Escrita de plano** | `training_plans`, `planned_workouts`, `nutrition_protocols` | `endura_create_training_plan`, `endura_upsert_planned_workouts`, `endura_set_workout_nutrition` | `write:planned` |
| **Contexto de saúde** (PHI) | `health_profile`, `health_exams` | `endura_get_health_profile`, `endura_save_health_profile`, `endura_list_exams`, `endura_add_exam`, `endura_update_exam` | `read:health` / `write:health` |
| Leitura de estado | — | `endura_get_pmc`, `endura_get_recovery`, `endura_get_readiness`, `endura_list_activities`, `endura_get_race_projection` | `read:*` |

O **contexto de saúde** persiste médico, plano de saúde e exames (pedidos→resultados, anexo por referência) — é PHI, com scope dedicado já incluído no bundle Coach. Quando vazio, a âncora retorna um `guidance` que orienta o Claude a coletar e salvar (onboarding). Salve **apenas o que o atleta compartilhar**.

> Manual completo para o agente (glossário, fluxos canônicos, regras): [`docs/llm-manual.md`](docs/llm-manual.md) · também servido em `GET /api/v1/public/llm-manual.md`.
> Setup e exemplos do pacote: [`packages/mcp-endura/README.md`](packages/mcp-endura/README.md).

## Documentacao

- [Documento Mestre de Produto (MVP v2.0)](docs/Endura_MVP.md) — visão, roadmap e especificações completas
- [Manual para Agentes IA (MCP)](docs/llm-manual.md) — conceitos, fluxos canônicos de coaching e regras invariantes
- [Design — Módulo de contexto de saúde](docs/plans/2026-06-29-personal-health-context-design.md) — schema, endpoints e privacidade do módulo PHI

### Detalhes por fase

| Documento | Descrição |
|---|---|
| [Regras de Negócio — Fase 1](docs/projeto/regras_negocio.md) | MVP: sincronização e registro de suplementação |
| [Regras de Negócio — Fase 2](docs/projeto/regras_negocio_fase2.md) | IA: OCR, NLP e insights |
| [Regras de Negócio — Fase 3](docs/projeto/regras_negocio_fase3.md) | Módulo treinador |
| [Integração — Fase 1](docs/projeto/integracao.md) | Strava OAuth e fluxo de dados |
| [Integração — Fase 2](docs/projeto/integracao_fase2.md) | OCR, NLP e clima histórico |
| [Integração — Fase 3](docs/projeto/integracao_fase3.md) | Permissões treinador-atleta |
| [Layout/UX — Fase 1](docs/projeto/layout_frontend.md) | Telas do MVP |
| [Layout/UX — Fase 2](docs/projeto/layout_frontend_fase2.md) | Telas com IA |
| [Layout/UX — Fase 3](docs/projeto/layout_frontend_fase3.md) | Telas do treinador |
