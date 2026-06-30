# @endura/mcp — Servidor MCP do Endura

Servidor [MCP](https://modelcontextprotocol.io) em **stdio** que expõe a API pública do Endura como _tools_ para o **Claude Code** / **Claude Desktop**. Com ele, o Claude vira um **consultor/treinador completo**: lê a base persistida do atleta, analisa (PMC, wellness, previsão de prova), e **grava de volta no Endura** análises, diretrizes e planos de treino com suplementação — de modo que **toda nova sessão recupera o contexto**.

É um wrapper fino: cada tool = 1 chamada REST em `/api/v1/public/*`, autenticada por API Key, respeitando scopes, audit log e rate limits do Endura. Sem acesso direto ao banco.

## 🚀 Conecte o SEU Claude ao Endura (guia para um novo usuário)

**O caminho, em 4 passos:**

1. **Tenha uma conta no Endura** e gere uma **API Key** em _Configurações → API Keys_, com o bundle **Coach** (read + write, já inclui saúde). Copie a key `endura_sk_...` — ela só aparece uma vez.
2. **Instale este servidor MCP** — veja [Build](#build). Você só precisa do `dist/index.js`.
3. **Registre no Claude** passando **duas coisas (e só elas):**
   - `ENDURA_API_URL` = `https://endura-api.onrender.com` (produção)
   - `ENDURA_API_KEY` = sua key `endura_sk_...`
   ```bash
   claude mcp add endura \
     --env ENDURA_API_URL=https://endura-api.onrender.com \
     --env ENDURA_API_KEY=endura_sk_xxxxxxxxxxxx \
     -- node /caminho/abs/para/endura/packages/mcp-endura/dist/index.js
   ```
4. **Valide:** peça ao Claude _"chame endura_get_coach_context"_. Se voltar seu perfil/snapshot, está pronto. Na 1ª vez o contexto de saúde vem vazio com um `guidance` que orienta o Claude a te perguntar médico/plano/exames.

**O que você passa para o Claude?** Só a **API Key** (e a URL). Nada de senha, nada de credencial de banco — o Claude lê e escreve tudo pela API pública, limitado aos scopes da sua key. A key é injetada por env var; você nunca a cola no chat.

**Qual a URL de doc para configurar tudo?**
- 📖 Manual do agente (conceitos, glossário, fluxos de coaching, regras): **https://endura-api.onrender.com/api/v1/public/llm-manual.md**
- 🔎 Discovery padrão (llms.txt): **https://endura-api.onrender.com/llms.txt**
- 🧩 Specs + tools prontas: `https://endura-api.onrender.com/api/v1/public/openapi.json` e `…/openapi/tools.json`
- 🛠️ Setup do MCP: este README · visão geral: [README do projeto](../../README.md).

> Usa **Claude Desktop** em vez do Code? Mesma coisa — registre via `.mcp.json`/config com os 2 envs (exemplo na seção [Conectar no Claude Code](#conectar-no-claude-code)).

## Pré-requisitos

1. **API do Endura no ar** (produção `https://endura-api.onrender.com`, ou local `http://localhost:8080`).
2. **Uma API Key** com o bundle **Coach**. Gere em _Configurações → API Keys_ no app, ou via `POST /api/auth/api-keys`. O coach completo usa: `read:profile, read:activities, read:planned, read:wellness, read:catalog, read:coach, read:health, write:nutrition, write:checkin, write:comments, write:coach, write:planned, write:health` (os scopes `*:health` cobrem o contexto de saúde — médico, plano, exames; são PHI).

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
  --env ENDURA_API_URL=https://endura-api.onrender.com \
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
        "ENDURA_API_URL": "https://endura-api.onrender.com",
        "ENDURA_API_KEY": "endura_sk_xxxxxxxxxxxx"
      }
    }
  }
}
```

> O servidor loga em **stderr** (stdout é o canal do protocolo). Se faltar `ENDURA_API_KEY`, ele encerra com erro.

## Fluxo de coaching (o que o Claude deve fazer)

1. `endura_get_coach_context` — **sempre primeiro**: perfil do coach, diretrizes ativas, últimas análises, **contexto de saúde** (médico/plano/exames + `guidance` de onboarding quando vazio) e snapshot.
2. Coletar dados: `endura_get_pmc`, `endura_get_wellness`, `endura_list_activities`, `endura_get_race_projection`, `endura_list_planned_workouts`; e, se o `guidance` de saúde vier preenchido, coletar e salvar com `endura_save_health_profile` / `endura_add_exam`.
3. Analisar (raciocínio do Claude).
4. Persistir: `endura_save_assessment`, `endura_upsert_coach_profile`, `endura_save_directive`.
5. Planejar: `endura_create_training_plan` → `endura_upsert_planned_workouts` → `endura_set_workout_nutrition`.
6. (Opcional) `endura_post_comment` em atividades.
7. Próxima sessão volta ao passo 1 — o contexto vem todo do Endura.

Detalhes de domínio (glossário, regras, periodização) estão no manual: `GET /api/v1/public/llm-manual.md`.

## Tools expostas

Leitura: `endura_get_summary`, `endura_get_readiness`, `endura_get_recovery`, `endura_list_activities`, `endura_get_activity`, `endura_get_activity_nutrition`, `endura_list_planned_workouts`, `endura_get_pmc`, `endura_get_pmc_forecast`, `endura_get_wellness`, `endura_search_catalog`, `endura_get_coach_context`, `endura_list_assessments`, `endura_list_directives`, `endura_get_race_projection`, `endura_list_races`, `endura_get_health_profile`, `endura_list_exams`.

Escrita: `endura_log_nutrition_item`, `endura_log_nutrition_bulk`, `endura_follow_protocol`, `endura_log_feedback`, `endura_log_daily_checkin`, `endura_post_comment`, `endura_save_assessment`, `endura_save_directive`, `endura_update_directive`, `endura_upsert_coach_profile`, `endura_create_race`, `endura_update_race`, `endura_delete_race`, `endura_create_training_plan`, `endura_upsert_planned_workouts`, `endura_update_planned_workout`, `endura_delete_planned_workout`, `endura_set_workout_nutrition`, `endura_save_health_profile`, `endura_add_exam`, `endura_update_exam`.

Contexto de saúde (PHI, scopes `*:health`): `endura_get_health_profile`, `endura_save_health_profile`, `endura_list_exams`, `endura_add_exam`, `endura_update_exam` — médico, plano de saúde e exames (pedidos→resultados). Vêm resumidos no `endura_get_coach_context`.

## Notas

- Standalone: depende só de `@modelcontextprotocol/sdk`. Pode ser copiado para fora do monorepo se quiser distribuir isolado.
- O catálogo de tools espelha `apps/api/src/modules/public-api/openapi.spec.ts`. Ao adicionar endpoint novo, atualize os dois.
