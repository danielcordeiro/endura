# @endura/mcp — Servidor MCP do Endura

Servidor [MCP](https://modelcontextprotocol.io) em **stdio** que expõe a API pública do Endura como _tools_ para o **Claude Code** / **Claude Desktop**. Com ele, o Claude vira um **consultor/treinador completo**: lê a base persistida do atleta, analisa (PMC, wellness, previsão de prova), e **grava de volta no Endura** análises, diretrizes e planos de treino com suplementação — de modo que **toda nova sessão recupera o contexto**.

É um wrapper fino: cada tool = 1 chamada REST em `/api/v1/public/*`, autenticada por API Key, respeitando scopes, audit log e rate limits do Endura. Sem acesso direto ao banco.

## Pré-requisitos

1. **API do Endura no ar** (local `http://localhost:8080` ou produção).
2. **Uma API Key** com o bundle **Coach** (`read:*` + `write:*`). Gere em _Configurações → API Keys_ no app, ou via `POST /api/auth/api-keys`. O coach completo precisa de: `read:profile, read:activities, read:planned, read:wellness, read:catalog, read:coach, write:nutrition, write:checkin, write:comments, write:coach, write:planned`.

## Build

```bash
# na raiz do monorepo (pnpm 9)
pnpm install
pnpm --filter @endura/mcp build
```

Gera `packages/mcp-endura/dist/index.js`.

## Conectar no Claude Code

```bash
claude mcp add endura \
  --env ENDURA_API_URL=https://<seu-app>.onrender.com \
  --env ENDURA_API_KEY=endura_sk_xxxxxxxxxxxx \
  -- node /caminho/abs/para/endura/packages/mcp-endura/dist/index.js
```

Ou edite o `.mcp.json` do projeto (exemplo em `.mcp.json.example`):

```json
{
  "mcpServers": {
    "endura": {
      "command": "node",
      "args": ["packages/mcp-endura/dist/index.js"],
      "env": {
        "ENDURA_API_URL": "http://localhost:8080",
        "ENDURA_API_KEY": "endura_sk_xxxxxxxxxxxx"
      }
    }
  }
}
```

> O servidor loga em **stderr** (stdout é o canal do protocolo). Se faltar `ENDURA_API_KEY`, ele encerra com erro.

## Fluxo de coaching (o que o Claude deve fazer)

1. `endura_get_coach_context` — **sempre primeiro**: perfil do coach, diretrizes ativas, últimas análises, snapshot.
2. Coletar dados: `endura_get_pmc`, `endura_get_wellness`, `endura_list_activities`, `endura_get_race_projection`, `endura_list_planned_workouts`.
3. Analisar (raciocínio do Claude).
4. Persistir: `endura_save_assessment`, `endura_upsert_coach_profile`, `endura_save_directive`.
5. Planejar: `endura_create_training_plan` → `endura_upsert_planned_workouts` → `endura_set_workout_nutrition`.
6. (Opcional) `endura_post_comment` em atividades.
7. Próxima sessão volta ao passo 1 — o contexto vem todo do Endura.

Detalhes de domínio (glossário, regras, periodização) estão no manual: `GET /api/v1/public/llm-manual.md`.

## Tools expostas

Leitura: `endura_get_summary`, `endura_get_readiness`, `endura_list_activities`, `endura_get_activity`, `endura_get_activity_nutrition`, `endura_list_planned_workouts`, `endura_get_pmc`, `endura_get_wellness`, `endura_search_catalog`, `endura_get_coach_context`, `endura_list_assessments`, `endura_list_directives`, `endura_get_race_projection`.

Escrita: `endura_log_nutrition_item`, `endura_log_nutrition_bulk`, `endura_follow_protocol`, `endura_log_feedback`, `endura_log_daily_checkin`, `endura_post_comment`, `endura_save_assessment`, `endura_save_directive`, `endura_update_directive`, `endura_upsert_coach_profile`, `endura_create_training_plan`, `endura_upsert_planned_workouts`, `endura_update_planned_workout`, `endura_delete_planned_workout`, `endura_set_workout_nutrition`.

## Notas

- Standalone: depende só de `@modelcontextprotocol/sdk`. Pode ser copiado para fora do monorepo se quiser distribuir isolado.
- O catálogo de tools espelha `apps/api/src/modules/public-api/openapi.spec.ts`. Ao adicionar endpoint novo, atualize os dois.
