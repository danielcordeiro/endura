# Endura Public API

API pública para consulta E escrita de dados de atletas via API Key. Pensada para integração com agentes IA (ex: openclaw) usando function calling, mas também útil para automações pessoais.

**Base URL (produção):** `https://api.endura.app`
**Base URL (local):** `http://localhost:8080`
**Versão:** `v1`

---

## Autenticação

Toda rota pública (exceto `/openapi.json` e `/openapi/tools.json`) exige uma API Key em **um** dos dois headers:

```http
X-API-Key: endura_sk_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

ou

```http
Authorization: Bearer endura_sk_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

### Gerando uma API Key

1. Acesse **Endura → Configurações → API Keys → Nova**
2. Dê um nome descritivo (ex: `"openclaw"`, `"Home Assistant"`)
3. Selecione um **bundle** (Coach / Read-only) ou marque **scopes** individuais
4. Escolha **expiração** (Nunca / 30 / 90 / 365 dias)
5. **Copie a chave imediatamente** — ela NUNCA será exibida novamente

### Scopes

| Scope | Acesso |
|---|---|
| `read:profile` | Perfil, snapshot e provas alvo |
| `read:activities` | Atividades executadas, nutrição, insights, comentários |
| `read:planned` | Treinos planejados e protocolos prescritos |
| `read:wellness` | HRV, sono, PMC, readiness, fitness tests, check-ins, analytics |
| `read:catalog` | Catálogo de produtos e presets de suplementação |
| `write:nutrition` | Registrar/atualizar consumo de produtos |
| `write:checkin` | Check-in diário e feedback pós-treino (RPE/notas) |
| `write:comments` | Postar comentários em atividades |
| `read:all` | (legacy) Wildcard que satisfaz qualquer `read:*` |
| `write:all` | Wildcard que satisfaz qualquer `write:*` |

**Bundles convenientes:**
- **Coach Mode** = todos os scopes (read + write). Use para o agente coach.
- **Read-only** = apenas reads.

### Rate limits

- **Reads** (GET, HEAD): 120 req/min por escopo
- **Writes** (POST, PUT, DELETE): 30 req/min por escopo

### Revogação e expiração

`DELETE /api/auth/api-keys/:id` ou UI → ícone lixeira. Keys expiradas (se `expiresAt` foi configurado) deixam de autenticar automaticamente.

### Audit log

Todas as operações de escrita são gravadas em `api_audit_logs` (método, path, status, resource_id) com retenção de 90 dias.

---

## Envelope padrão de resposta

Sucesso: `{ "data": { ... } }`. Erro: `{ "code": "ERR_*", "message": "...", "status": 4xx|5xx }`.

| Código | Status | Quando |
|---|---|---|
| `ERR_NO_API_KEY` | 401 | Header ausente |
| `ERR_INVALID_API_KEY` | 401 | Key inválida, revogada ou expirada |
| `ERR_INSUFFICIENT_SCOPE` | 403 | Key não tem o scope exigido pelo endpoint |
| `ERR_VALIDATION` | 400 | Body/query/params inválido |
| `ERR_INVALID_RANGE` | 400 | `from > to` |
| `ERR_NOT_FOUND` | 404 | Recurso não pertence ao usuário |
| `ERR_ACTIVITY_NOT_FOUND` | 404 | Activity inexistente |

---

## Convenções

- **Datas puras**: `YYYY-MM-DD` (ex: `2026-04-18`)
- **Timestamps**: ISO 8601 UTC
- **Duração**: segundos em atividades, minutos em treinos planejados
- **Distância**: metros · **Potência**: watts · **FC**: bpm · **Peso**: kg · **Temperatura**: °C
- **Disciplinas**: `run` | `bike` | `swim` | `other` | `brick`
- **Paginação**: `?limit=<1-200>&offset=<N>` (default `limit=50`)
- **Ranges**: `?from=YYYY-MM-DD&to=YYYY-MM-DD`

---

## Discovery (sem auth)

### `GET /llms.txt`
Entry point padrão [llmstxt.org](https://llmstxt.org) com links para todos os recursos abaixo. Servido na raiz do domínio da API.

### `GET /api/v1/public/llm-manual.md`
**Manual narrativo para agentes IA**: glossário de domínio (TSS, CTL, ATL, TSB, RPE, fueling), conceitos do modelo de dados, fluxos canônicos para registrar suplementação em linguagem natural, regras invariantes e boas práticas conversacionais. Versão HTML em `/docs/llm`.

### `GET /api/v1/public/openapi.json`
Spec OpenAPI 3.1 completo da API pública.

### `GET /api/v1/public/openapi/tools.json`
Catálogo de tools no formato Anthropic, pronto pra `system.tools = [...]`. Cole no openclaw e os 15 endpoints viram tools.

---

## Endpoints de LEITURA

### `GET /me` — `read:profile`
Perfil + athleteProfile.

### `GET /summary` — `read:profile`
Snapshot: nextPlannedWorkout, todayActivity, latestWellness, activeRace.

### `GET /activities?from=&to=&discipline=&limit=&offset=` — `read:activities`
Lista paginada de atividades executadas.

### `GET /activities/:id` — `read:activities`
Detalhe completo (incluindo `rawData`, `adverseEvents`, RPE, notes).

### `GET /activities/:id/nutrition` — `read:activities`
Log de suplementação + comparison vs protocolo (status green/yellow/red por macro).

### `GET /activities/:id/insights` — `read:activities`
Lista de insights de IA da atividade (gerados pelo Mentor interno).

### `GET /activities/:id/comments` — `read:activities`
Comentários da atividade (do treinador/coach IA).

### `GET /planned-workouts?from=&to=&discipline=` — `read:planned`
Lista de treinos planejados (plano Endura + intervals.icu).

### `GET /planned-workouts/:id` — `read:planned`
Detalhe com `structure` (steps JSONB) e `nutritionProtocol`.

### `GET /wellness?from=&to=` — `read:wellness`
HRV, sono, peso, SpO2, stress, body battery, source.

### `GET /performance/pmc?from=&to=` — `read:wellness`
PMC: TSS / CTL / ATL / TSB por dia.

### `GET /performance/readiness` — `read:wellness`
Readiness mais recente: score, level, mentorRecommendation, fatores.

### `GET /race-goals` — `read:profile`
Provas cadastradas.

### `GET /fitness-tests` — `read:wellness`
Testes T30/FTP20/Cooper realizados.

### `GET /daily-checkin?from=&to=` — `read:wellness`
Histórico de check-ins diários.

### `GET /nutrition/catalog/search?q=&category=&limit=` — `read:catalog`
Busca produto no catálogo curado. Retorna macros canônicos por serving.

### `GET /nutrition/presets` — `read:catalog`
Presets de suplementação do usuário.

### `GET /analytics/weekly?weeks=8` — `read:wellness`
Agregação semanal por disciplina: TSS, distância, duração, contagem.

### `GET /analytics/nutrition-summary?days=30` — `read:wellness`
Média carbs/h, sodium/h e adherence por disciplina nos últimos N dias.

---

## Endpoints de ESCRITA

### `POST /activities/:id/nutrition-items` — `write:nutrition`
Adiciona 1 item de suplementação ao log da atividade.

Body (`NutritionItem`):
```json
{
  "phase": "during",
  "minuteOffset": 45,
  "productName": "Gel Carb-Up Frutas",
  "brand": "Athletica",
  "quantity": 1,
  "unit": "unit",
  "carbsG": 30,
  "sodiumMg": 30,
  "caffeineMg": 0,
  "kcal": 120,
  "source": "agent"
}
```

### `POST /activities/:id/nutrition-items/bulk` — `write:nutrition`
Adiciona até 30 itens em transação. **Preferir sempre** que o usuário descrever múltiplos produtos numa frase só ("comi 2 géis, 1 sache e 1 isotônico"). All-or-nothing.

Body: `{ "items": [NutritionItem, ...] }` (1 ≤ N ≤ 30)

### `PUT /activities/:id/nutrition-items/:itemId` — `write:nutrition`
Atualiza um item. Body com campos parciais.

### `DELETE /activities/:id/nutrition-items/:itemId` — `write:nutrition`
Remove um item.

### `POST /activities/:id/follow-protocol` — `write:nutrition`
Copia o protocolo prescrito para o log (1-tap). Body: `{ "protocolId": "uuid" }`.

### `POST /activities/:id/feedback` — `write:checkin`
Registra feedback pós-treino. Body:
```json
{
  "perceivedEffort": 8,
  "notes": "Pernas pesadas no segundo intervalo",
  "adverseEvents": ["calor", "cabeça pesada"]
}
```

### `POST /daily-checkin` — `write:checkin`
Upsert do check-in do dia. Body:
```json
{
  "date": "2026-05-11",
  "feeling": 4,
  "muscleSoreness": 2,
  "injuryNote": null
}
```

### `POST /activities/:id/comments` — `write:comments`
Posta comentário (ex: observação do coach IA). Body: `{ "text": "Cuidar do fueling — carbs/h ficou abaixo do alvo" }`.

---

## Como integrar no openclaw (function calling)

1. No setup do agente, faça `GET /api/v1/public/openapi/tools.json` (sem auth)
2. Cole o array `tools` no `system.tools` do Claude/OpenAI
3. Para cada tool call do modelo, dispare a chamada HTTP correspondente com `X-API-Key`
4. Devolva o body da resposta como `tool_result`

### System prompt sugerido

```
Você é o openclaw, coach de triatlon. Você tem acesso via tools à plataforma
Endura do atleta (treinos sincronizados de Strava/intervals.icu, métricas
PMC, wellness, suplementação).

Regras:
- SEMPRE chame endura_get_summary() no início da conversa para ancorar contexto.
- Antes de recomendar intensidade, consulte endura_get_readiness.
- Para registrar suplementação descrita pelo usuário em linguagem natural:
  1. Identifique a atividade alvo (default: todayActivity do summary).
  2. Pra cada produto mencionado, use endura_search_catalog pra resolver
     nome canônico e macros. Se ambíguo, pergunte.
  3. Bata tudo em UMA chamada endura_log_nutrition_bulk(items[]).
  4. Se o usuário disse "segui o protocolo", use endura_follow_protocol.
- Após registrar nutrição, analise (carbs/h vs alvo) e deixe um
  endura_post_comment com observação curta pra histórico.

Unidades: distância em metros, duração em segundos (activities) ou
minutos (planejados). Datas em YYYY-MM-DD UTC.
```

---

## Modelo de dados resumido

```
user
 ├─ athleteProfile (1:1)
 ├─ activities (N)        ← executadas
 │   ├─ nutritionLog (1:1)
 │   │   └─ nutritionItems (N) [phase, minuteOffset, productName, macros]
 │   ├─ aiInsights (N)
 │   └─ activityComments (N)
 ├─ plannedWorkouts (N)   ← origem: plan AI ou intervals.icu
 │   └─ nutritionProtocol (1:1)  ← prescrito
 ├─ raceGoals (N)
 ├─ fitnessTests (N)
 ├─ dailyMetrics (N)      ← wellness + PMC por data
 ├─ dailyCheckins (N)     ← feeling/soreness subjetivo
 └─ supplementPresets (N)
```

`activities.plannedWorkoutId → plannedWorkouts.id` quando a atividade cumpre um treino planejado.

---

## Segurança

- Keys hasheadas (SHA-256). Texto plano só existe na resposta de criação.
- Revogação imediata (`revoked_at`), expiração opcional (`expires_at`).
- `last_used_at` atualizado em fire-and-forget.
- Audit log de escritas com retenção 90d.
- Uma key compromete apenas dados do próprio usuário.

---

## Changelog

- **2026-05-11** — v1.1: scopes granulares, expiresAt opcional, audit log, 13 novos endpoints (writes de nutrição/feedback/checkin/comments, leituras de insights/comments/nutrition/catalog, analytics), discovery via `/openapi.json` e `/openapi/tools.json`.
- **2026-04-17** — v1 inicial.
