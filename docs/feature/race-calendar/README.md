---
created: 2026-06-25
updated: 2026-06-25
version: 1.0.0
author: Daniel
---

# Calendário de Provas (A/B/C)

## 📖 Visão Geral

Antes, o Endura modelava **uma única "Prova Alvo"**: cadastrar outra desativava a anterior, sem prioridade nem visão de calendário. Provas de preparação (ex.: uma meia maratona usada como treino) não tinham onde morar.

Agora há um **calendário de provas** com prioridade **A** (prova alvo principal), **B** (importante) e **C** (treino/preparação). Várias provas coexistem; a prova **A** continua sendo a que alimenta previsão de prova, prontidão e periodização. O `distance` aceita tanto distâncias de triathlon quanto provas avulsas (corrida 5k–42k, ciclismo, natação, outra).

## 🎯 Regras de Negócio

### RN001 - Prioridade única para A
- **Descrição**: Só pode haver **uma** prova A ativa. Criar (ou promover) uma prova A **rebaixa a A anterior para B** — ela não some, vira parte do calendário.
- **Validações**: scope `write:planned` (API pública) ou JWT do dono (app).

### RN002 - Seleção determinística da prova-alvo
- **Descrição**: A prova-alvo usada por previsão/dashboard/plano/snapshots é escolhida por `athlete.service.findTargetRaceGoal`: **A ativa mais próxima no futuro → qualquer A ativa → ativa mais próxima → qualquer ativa**.
- **Critério**: Com várias provas ativas, todos os pontos miram a MESMA prova (evita não-determinismo do `findFirst`).

### RN003 - Tipos de prova
- **Descrição**: `distance` ∈ {sprint, olympic, 70.3, full, run_5k, run_10k, run_21k, run_42k, bike_event, swim_event, other}. A previsão físico-fisiológica só atua em `70.3`; demais tipos entram só no calendário.

### RN004 - Ownership e arquivamento
- **Descrição**: Todo update/delete valida `userId`. `active=false` arquiva (some das listas padrão, sem apagar). `?includeArchived=true` traz as arquivadas.

## 🔗 Integrações (endpoints)

### App (JWT)
| Método | Rota |
|---|---|
| GET | `/api/athlete/race-goal` (prova-alvo A) |
| GET | `/api/athlete/race-goals` (calendário; `?includeArchived`) |
| POST | `/api/athlete/race-goal` |
| PUT·DELETE | `/api/athlete/race-goal/:id` |

### API pública (API Key) + MCP
| Método | Rota | Scope | Tool MCP |
|---|---|---|---|
| GET | `/api/v1/public/race-goals` | read:profile | `endura_list_races` |
| POST | `/api/v1/public/race-goals` | write:planned | `endura_create_race` |
| PUT | `/api/v1/public/race-goals/:id` | write:planned | `endura_update_race` |
| DELETE | `/api/v1/public/race-goals/:id` | write:planned | `endura_delete_race` |

## 🧪 Cenários de Teste

### Sucesso
- POST cria prova; criar prova A rebaixa a A anterior para B.
- PUT atualiza campos; DELETE remove; GET lista ordenado por data.
- `race-projection` mira a prova A mesmo com provas B/C presentes.

### Erro
- PUT/DELETE de prova de outro usuário → 404 `ERR_RACE_GOAL_NOT_FOUND`.
- Sem `write:planned` → 403 `ERR_INSUFFICIENT_SCOPE`.

## 📋 Dependências
- **Database**: `race_goals` ganha `priority` (varchar 1), `location`, `notes`. Migration `drizzle/migrations/0007_race_calendar.sql` (idempotente).
- **Backend**: `athlete/athlete.service.ts` (findTargetRaceGoal + CRUD), `athlete.routes.ts`, `athlete.schemas.ts`, `public-api/public-api.routes.ts`, `openapi.spec.ts`; consumidores priority-aware em `performance`, `dashboard`, `plan`.
- **Web**: `components/settings/race-calendar-section.tsx` (CRUD em Configurações), `components/dashboard/upcoming-races-card.tsx` (provas B/C no dashboard).
- **MCP**: `packages/mcp-endura/src/tools.ts` (4 tools novas).

## 📋 Histórico de Alterações

| Data       | Versão | Autor  | Alteração |
|------------|--------|--------|-----------|
| 2026-06-25 | 1.0.0  | Daniel | Criação: calendário de provas A/B/C, CRUD, MCP, dashboard |
