# Plano de Implementação — Módulo de Contexto Pessoal/Saúde

Referência: [`2026-06-29-personal-health-context-design.md`](./2026-06-29-personal-health-context-design.md)
Branch: `feat/health-context-mcp`

Ordem pensada para que cada passo seja verificável isoladamente (typecheck/migration/curl antes do MCP).

## Passo 1 — Schema + migration
**Arquivo:** `apps/api/drizzle/schema.ts`
- Adicionar `healthProfile` (tabela `health_profile`) e `healthExams` (`health_exams`) conforme design (após o bloco `coach*`).
- Adicionar relations se o módulo usar `db.query.*` (espelhar `coachAssessmentsRelations` se necessário — provavelmente não precisa de relations p/ as queries planejadas).
- `pnpm --filter @endura/api db:generate` → **revisar o SQL gerado** (cuidado com drift de snapshot: garantir que só emita as 2 tabelas novas) → `db:migrate`.
- Verificação: `\d health_profile` / `\d health_exams` no banco; nenhuma tabela existente recriada.

## Passo 2 — Scopes
**Arquivo:** `apps/api/src/modules/api-key/scopes.ts`
- `read:health` em `READ_SCOPES`; `write:health` em `WRITE_SCOPES`.
- Incluídos automaticamente no `COACH_BUNDLE` (já faz spread de READ+WRITE — confirmar).
- Teste unitário (se houver suíte de scopes): `satisfies(['read:all'],'read:health')===true`, `satisfies(['read:coach'],'read:health')===false`.

## Passo 3 — Zod schemas + endpoints
**Arquivo:** `apps/api/src/modules/public-api/public-api.routes.ts`
- Schemas zod (topo do arquivo, padrão `.strict()`): `healthProfileBody` (todos campos opcionais p/ upsert parcial), `healthExamBody` (create), `healthExamPatchBody` (update parcial: status/resultDate/summary/data/attachmentRef/...).
- Handlers (espelhar `/coach/profile` e `/coach/directives`):
  - `GET /api/v1/public/health/profile` (`read:health`)
  - `PUT /api/v1/public/health/profile` (`write:health`, upsert insert-or-update)
  - `GET /api/v1/public/health/exams` (`read:health`, filtros status/type/from/to + limit)
  - `POST /api/v1/public/health/exams` (`write:health`)
  - `PATCH /api/v1/public/health/exams/:id` (`write:health`, valida `userId` antes do update)
- Verificação: curl com key do `COACH_BUNDLE` em cada endpoint; conferir envelope e `api_audit_logs`.

## Passo 4 — Âncora `coach/context` + ensino
**Arquivo:** mesmo `public-api.routes.ts`, handler `GET /coach/context`
- Acrescentar ao `Promise.all`: `healthProfile.findFirst(userId)` e `healthExams.findMany(userId, orderBy examDate desc, limit 5)`.
- Adicionar à resposta a chave `health: { profile, recentExams, guidance }`.
  `guidance` = string de onboarding quando `profile == null`, senão `null`.
- Verificação: GET context com perfil vazio → vem `guidance`; após PUT profile → `guidance == null` e `profile` populado.

## Passo 5 — Tools MCP
**Arquivo:** `packages/mcp-endura/src/tools.ts`
- 5 tools novas (pt-BR), mapeando método/rota/scope (espelhar tools de coach):
  `endura_get_health_profile`, `endura_save_health_profile`, `endura_list_exams`,
  `endura_add_exam`, `endura_update_exam`.
- Atualizar a `description` de `endura_get_coach_context` citando o bloco `health`.
- Build: `tsc` local do pacote. Verificar que entram no array `TOOLS`.

## Passo 6 — OpenAPI + manual
**Arquivos:** `apps/api/src/modules/public-api/openapi.spec.ts`, `docs/llm-manual.md`
- Garantir que `buildAnthropicTools` expõe as novas tools (se for derivado, conferir; senão adicionar).
- `llm-manual.md`: nova seção "Contexto de saúde" + atualizar o fluxo canônico de sessão (passo 1: a âncora agora traz saúde; onboarding se vazio) + nota de privacidade.

## Passo 7 — Verificação E2E
- Typecheck `@endura/api` + build MCP limpos.
- `claude mcp` reconectar; `endura_get_coach_context` mostra guidance; `endura_save_health_profile`; nova sessão recupera do Endura.

## Passo 8 — Backfill do Daniel (dado real)
- Via MCP (preferível) `endura_save_health_profile`: providers=[[MEDICO_REDIGIDO], sports_doctor, CRM [REDIGIDO]], healthPlan={IPASGO, beneficiaryId [IPASGO_ID_REDIGIDO], phone [TELEFONE_REDIGIDO], email [EMAIL_REDIGIDO]}.
- `endura_add_exam`: painel 07/2026, `examType: lab_panel` (+ um para ergospirometry e echocardiogram, ou um único com items), `status: requested`, `provider: [MEDICO_REDIGIDO]`, `examDate: 2026-06-27`, `items` com os exames/TUSS, `attachmentRef` p/ os PDFs.
- Atualizar memória local ([[exames-07-2026]], [[daniel-saude-contexto]]) para apontar que a fonte de verdade agora é o Endura.

## Passo 9 — PR
- Push da branch `feat/health-context-mcp`; abrir PR com resumo + link do design. (Só com OK do Daniel — push/PR é ação externa.)

## Riscos / atenção
- **Drift de snapshot do drizzle** ([[endura-drizzle-snapshot-drift]]): revisar SQL gerado; usar SQL idempotente se preciso.
- **pnpm/binários locais** ([[endura-pnpm-engine-mismatch]]): rodar tsc/tsx/drizzle pelos binários locais.
- **Migration em produção:** o `preDeployCommand` do Render roda `drizzle-kit migrate` no deploy — a migration nova será aplicada ao mergear/deployar. Validar localmente antes.
