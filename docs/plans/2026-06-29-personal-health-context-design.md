# Design — Módulo de Contexto Pessoal/Saúde no Endura

**Data:** 2026-06-29
**Status:** Aprovado (aguardando plano de implementação)
**Autor:** Daniel + Claude (sessão de coaching/MCP)

## Problema / motivação

Hoje informações pessoais e de saúde do atleta (médico responsável, plano de saúde, exames
pedidos/resultados) não têm lugar no Endura. Ficavam só na memória local do Claude — presa a
uma máquina e invisível para o MCP. O objetivo é:

1. Persistir esse contexto **no banco do Endura**, lido/escrito via **MCP** de qualquer máquina.
2. Ser **genérico para todos os usuários**, não só o caso do Daniel.
3. O MCP deve **"ensinar" o Claude** onde salvar essas informações ao conectar, para que
   qualquer pessoa use `Claude + MCP do Endura` como coach pessoal — incluindo suplementação
   (já existente) e contexto médico (novo).

## Decisões travadas (brainstorming)

- **Escopo do módulo:** perfil de saúde estruturado + registro de exames/documentos (com
  anexo por referência). **NÃO** é prontuário completo (sem labs analito-a-analito em série).
- **Mecanismo de ensino:** âncora (`coach/context`) + `llm-manual`. Sem tool de onboarding
  dedicada; aproveita o hábito do Claude de chamar `coach/context` primeiro.
- **Controle de acesso:** scope próprio `read:health`/`write:health`, **incluído no
  `COACH_BUNDLE`** e coberto pelos wildcards `read:all`/`write:all`.

## Arquitetura

Mesmo padrão do módulo de coaching (verificado em `apps/api`):

```
Claude  ──(stdio)── packages/mcp-endura ──(HTTPS + X-API-Key)── apps/api /api/v1/public/health/* ── Postgres
```

Duas tabelas novas espelhando `coach_profile` (1:1, upsert) e `coach_directives` (N:1, ciclo de vida).

### 1) Schema (`apps/api/drizzle/schema.ts`)

**`health_profile`** — 1:1 com user, upsert:
- `id` uuid PK · `userId` uuid notNull unique FK users cascade
- `providers` jsonb — `[{role: 'sports_doctor'|'physio'|'nutritionist'|'cardiologist'|'other', name, registro, specialty, contact}]`
- `healthPlan` jsonb — `{name, beneficiaryName, beneficiaryId, phone, email, portalUrl}`
- `allergies` text[]
- `medications` jsonb — `[{name, dose, schedule, reason}]`
- `conditions` text[]
- `notes` text
- `updatedByKeyId` uuid FK apiKeys set null · `createdAt` · `updatedAt`

**`health_exams`** — N:1 com user, create + update (status/resultado):
- `id` uuid PK · `userId` uuid notNull FK users cascade
- `examType` varchar(40) notNull — `lab_panel|ergospirometry|echocardiogram|imaging|other`
- `title` varchar(255)
- `status` varchar(20) notNull default `requested` — `requested|scheduled|collected|resulted|reviewed`
- `provider` varchar(255)
- `examDate` date · `resultDate` date (nullable)
- `items` jsonb — `[{name, tuss}]`
- `summary` text
- `data` jsonb (resultados estruturados, opcional)
- `attachmentRef` varchar(500) (link/caminho do PDF, por referência)
- `createdByKeyId` uuid FK apiKeys set null · `createdAt`
- índice `idx_health_exams_user_date` em `(userId, examDate)`

### 2) Scopes (`apps/api/src/modules/api-key/scopes.ts`)
- Adicionar `read:health` em `READ_SCOPES`, `write:health` em `WRITE_SCOPES`.
- Incluir ambos no `COACH_BUNDLE`.
- `satisfies()` já cobre via prefixo `read:`/`write:` (wildcards).

### 3) Endpoints (`apps/api/src/modules/public-api/public-api.routes.ts`)
- `GET /api/v1/public/health/profile` (`read:health`)
- `PUT /api/v1/public/health/profile` (`write:health`, upsert parcial — só campos enviados)
- `GET /api/v1/public/health/exams?status&type&from&to` (`read:health`)
- `POST /api/v1/public/health/exams` (`write:health`)
- `PATCH /api/v1/public/health/exams/:id` (`write:health`, valida `userId` ownership)

Envelope `{ data }` / `{ code,message,status }`, validação zod (`.strict()`), `handleServiceError`,
auditoria via hook `onResponse` existente.

### 4) Âncora + ensino (`GET /coach/context`)
Adicionar ao `Promise.all` o `health_profile` e os últimos 5 `health_exams`. Resposta ganha:
```json
"health": { "profile": {...}|null, "recentExams": [...], "guidance": "..."|null }
```
`guidance` só é preenchido quando `profile` é null: texto curto instruindo o Claude a perguntar
médico/plano/exames e salvar via `endura_save_health_profile` / `endura_add_exam`.

### 5) Tools MCP (`packages/mcp-endura/src/tools.ts`, pt-BR)
- `endura_get_health_profile` (read:health)
- `endura_save_health_profile` (write:health) → PUT (upsert)
- `endura_list_exams` (read:health)
- `endura_add_exam` (write:health) → POST
- `endura_update_exam` (write:health) → PATCH /:id

Atualizar a descrição de `endura_get_coach_context` para citar o bloco de saúde.

### 6) Docs
- `docs/llm-manual.md`: seção "Contexto de saúde" — o que é, onde salvar, fluxo canônico
  (perguntar → `save_health_profile`; exame pedido → `add_exam (requested)` → `update_exam
  (resulted + summary)`), nota de privacidade.
- `openapi.spec.ts` / `buildAnthropicTools`: as 5 tools entram no `tools.json` automaticamente.

### 7) Privacidade
Scope dedicado como gatekeeper; auditoria de escrita já existente; sem PHI em logs de erro;
mesmo Postgres/Supabase (sem nova superfície externa); MCP é pass-through com API key. A
`guidance` instrui o Claude a salvar apenas o que o atleta compartilhar.

## Verificação (end-to-end)
1. Typecheck `@endura/api`; build do pacote MCP via `tsc` local.
2. `db:generate` → revisar SQL → `db:migrate` (cuidado com drift de snapshot e pnpm/binários locais).
3. curl com key do `COACH_BUNDLE` (agora c/ health): PUT profile → GET context mostra `health`
   → POST exam → PATCH exam → conferir linha em `api_audit_logs`.
4. Teste unitário de `satisfies()` para `read:health`/`write:health` (inclui wildcard).
5. E2E MCP: `endura_get_coach_context` (ver guidance) → `save_health_profile` → reconectar nova
   sessão e confirmar contexto voltando do Endura.

## Backfill (caso real do Daniel)
Ao final, popular `health_profile` do Daniel (dados reais de médico/plano de saúde — ver
registro privado, não versionado) + `health_exams` do painel 07/2026 (`status: requested`,
`items` com os 48 exames/TUSS, `attachmentRef` pros PDFs). Migra o que hoje está só na memória
local do Claude para o Endura.

## Fora de escopo (YAGNI)
- Resultados laboratoriais estruturados por analito em série temporal e análise de tendência.
- Hospedagem de arquivos de exame (só referência por link/caminho).
- Tool de onboarding dedicada.
