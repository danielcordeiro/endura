# Intratreino: Sugestão Default + Log Pós-Treino

**Data:** 2026-04-17
**Status:** Design aprovado — pronto para plano de implementação
**Escopo:** MVP de suplementação intratreino (gels, sal, isotônico) com default determinístico por regras e log pós-atividade

## Motivação

O sistema já tem um pipeline robusto de nutrição por treino (`nutrition_protocols`, `nutrition_planner`, prompt de IA via Claude), mas exige ação explícita — o atleta precisa clicar "gerar protocolo" em cada treino, aguardar 2-5s da IA, revisar, aceitar. Na prática, o cadastro fica vazio porque o atrito é alto.

O que se pretende:

1. **Antes do treino:** atleta abre o treino e já vê uma sugestão sensata calculada na hora, sem esperar IA, com opção de aceitar em 1 clique ou personalizar.
2. **Depois do treino:** quando a atividade é sincronizada e vinculada ao planned_workout, o atleta é convidado a logar o que de fato consumiu — marca/modelo do gel inclusive — gerando histórico granular pra análise futura (GI, performance, adherence).

Resultado: de "feature teoricamente existe" para "feature usada em todo treino".

## Princípios de design

- **Determinístico antes de IA** — heurísticas intratreino (30-90g carb/h conforme duração, 500-700mg Na/h conforme sweat rate) são bem estabelecidas. IA não adiciona valor relevante e custa latência + $.
- **Lazy + 1 clique** — nada é gravado sem intenção explícita. `GET suggestion` não persiste; só `POST accept` grava.
- **Log opcional** — nunca bloqueia o fluxo do atleta. O prompt aparece mas é dispensável. Retroativo em até 30 dias.
- **Zero migração** — tudo encaixa no schema existente (`nutrition_protocols`, `nutrition_logs`, `nutrition_items`, `product_catalog`).
- **Reuso de componentes** — `NutritionTimeline`, tokens de design, `DailyNutritionCard` parcial.

## Fluxos

### Fluxo A — Pré-treino (sugestão)

1. Usuário abre `/treino/[id]` de um treino futuro.
2. API retorna o treino e — se não existe `nutrition_protocol` aceito — calcula uma sugestão via regras determinísticas (`intra-workout-rules.ts`) sem persistir.
3. UI mostra card "Nutrição sugerida" com resumo + 2 botões: **Usar isso** (persiste) ou **Personalizar** (abre editor).
4. Se já existe protocolo aceito, mostra card "Nutrição prescrita" com timeline e botão **Editar**.

### Fluxo B — Pós-treino (log)

1. Sync do Strava/intervals cria `activity` e, quando bate horário, preenche `activity.plannedWorkoutId`.
2. Endpoint `GET /api/nutrition/log/pending` lista activities com `plannedWorkoutId`, protocolo aceito e **sem log ainda**, ordenadas por data desc, janela de 30 dias.
3. Dashboard exibe card "Você fez esse treino. Registrar nutrição?" pegando o mais recente da lista. Dispensável. Também acessível via botão manual em `/treino/[id]` e `/atividade/[id]`.
4. Modal de log:
   - **Toggle "Segui o plano"** → Sim grava log idêntico ao protocolo com `followedExactly=true, adherenceScore=100`.
   - **Não / Registrar detalhes** → mostra cada item prescrito com:
     - Checkbox (default ON; OFF = skipped, reduz adherence)
     - Quantidade editável (default = prescrito)
     - "+ detalhar" expande campos opcionais **Produto real** e **Marca** com autocomplete sobre `product_catalog` ou texto livre
   - Adherence recalcula em tempo real.
5. Salva em `nutrition_logs` + `nutrition_items`.

## Modelo de dados

Nenhuma migração. Mapeamento nas tabelas existentes:

| Tabela | Papel |
|---|---|
| `nutrition_protocols` | Protocolo aceito pelo atleta. `status='accepted'`, `acceptedAt=now`. |
| `nutrition_logs` | Log do consumo real. `followedExactly`, `adherenceScore`, totais, `activityId`, `nutritionProtocolId`. |
| `nutrition_items` | 1 linha por produto consumido. `productName`, `brand`, `quantity`, carbs/sodium/caffeine. |
| `product_catalog` | Fonte do autocomplete. Leitura apenas no MVP. |

## Regras determinísticas

Implementadas em `apps/api/src/modules/nutrition-planner/intra-workout-rules.ts` (~80 linhas, testáveis com snapshots).

**Taxa de carboidratos:**
```
duracao < 60min OR zona Z1/Z2    → 30g/h
duracao 60-120min, zona Z2/Z3    → 45g/h
duracao 120-180min               → 60g/h
duracao > 180min                 → 75g/h
```

**Taxa de sódio:**
```
sweatRateHigh OR clima quente    → 700mg/h
default                          → 500mg/h
```

**Cadência:**
```
giSensitivity=true               → 30min
default                          → 20min
```

**Fallback de perfil incompleto:** assume 70kg, sweat normal, sem GI. Nunca erra por dados faltando.

**Caso especial:** treinos Z1 curtos (< 45min) retornam protocolo vazio e UI mostra "Sem necessidade de suplementação — água suficiente."

## APIs

```
GET  /api/nutrition-planner/suggestion/:workoutId
     → { items, totals, source: 'default-rules' }  # nao persiste

POST /api/nutrition-planner/accept-default/:workoutId
     Body: { items?, customizations? }
     → { protocolId, status: 'accepted' }

GET  /api/nutrition/log/pending
     → [{ activityId, plannedWorkoutId, workoutTitle, scheduledDate, protocolId }]

POST /api/nutrition/log/:activityId
     Body: {
       followedExactly: true |
       { items: [{ prescribedItemId, consumedQuantity, productName?, brand?, skipped? }] }
     }
     → { logId, adherenceScore }

GET  /api/nutrition/products?search=&limit=
     → [{ id, name, brand, category, carbsG, sodiumMg, caffeineMg }]
```

## Arquivos afetados

**Backend (novos):**
- `apps/api/src/modules/nutrition-planner/intra-workout-rules.ts`

**Backend (modificados):**
- `apps/api/src/modules/nutrition-planner/nutrition-planner.routes.ts` (+2 rotas)
- `apps/api/src/modules/nutrition-planner/nutrition-planner.service.ts` (+2 funções)
- `apps/api/src/modules/nutrition/nutrition.routes.ts` (+3 rotas: log/pending, log/:activityId, products)
- `apps/api/src/modules/nutrition/nutrition.service.ts` (+3 funções)

**Frontend (novos):**
- `apps/web/components/nutrition/intra-workout-suggestion-card.tsx`
- `apps/web/components/nutrition/log-pending-card.tsx`
- `apps/web/components/nutrition/log-modal.tsx`

**Frontend (modificados):**
- `apps/web/app/(app)/treino/[id]/page.tsx` (integra card de sugestão + botão de log manual)
- `apps/web/app/(app)/dashboard/page.tsx` (integra card de log pendente)

## Edge cases

- **Protocolo editado após log:** log permanece isolado; adherence snapshot no momento da gravação.
- **Activity sem plannedWorkoutId:** fora do escopo MVP (fase 2 terá log ad-hoc).
- **Idempotência:** `POST accept-default` retorna protocolo existente se já aceito.
- **Treino Z1 curto:** retorna protocolo vazio; UI mostra mensagem específica.
- **Perfil incompleto:** defaults conservadores; nunca falha.
- **Log retroativo:** até 30 dias via card; depois só manual.
- **Strava sync atrasado:** entra na fila quando vinculado.
- **Autocomplete sem match:** input livre sempre aceita; grava como texto.

## Testes

**Unit (vitest):**
- `intra-workout-rules.ts` — snapshots para run 60min Z2, bike 3h Z3, swim 45min, Z1 curto, sem perfil, sweat high, GI sensitivity.
- `calculateAdherence(prescribed, actual)` — 100%, 80%, 50%, todos skipped, item extra.

**Integração (API end-to-end):**
- Criar planned_workout → GET suggestion → accept → GET workout retorna protocol → POST log followedExactly=true → GET log retorna adherenceScore=100.

**Manual (UI):**
- Fluxo pré-treino completo.
- Fluxo de log com detalhes (autocomplete, skipped, marca livre).
- Dashboard card aparece/some conforme logs.

## Rollout

Sem feature flag. Aditivo. Implementação sequencial em ~4h:

1. `intra-workout-rules.ts` + snapshot tests — 30min
2. API `GET /suggestion` + `POST /accept-default` — 20min
3. `IntraWorkoutSuggestionCard` + integração em `/treino/[id]` — 40min
4. API `GET /log/pending` + `POST /log` + `GET /products` — 30min
5. `LogPendingCard` + integração dashboard — 25min
6. `LogModal` com toggle + detalhes + autocomplete — 60min
7. Smoke manual + ajustes — 30min

## Fora de escopo (fase 2)

- Log ad-hoc sem planned_workout vinculado
- Adherence analytics no PMC/dashboard
- Botão "Refinar com IA" aciona Claude sobre o default
- Produto favorito por categoria (auto-preenche "Gel esportivo" com "GU Vanilla")
- Insights históricos "gel X teve 3x GI em 12 uses"

## Decisões explicitamente rejeitadas

- **IA sempre:** descartada — latência e custo sem valor para o caso comum.
- **Default proativo persistindo:** descartado — polui DB com protocolos não seguidos.
- **Log por totais agregados (X gels, Y sais):** descartado — perde granularidade de timing e produto real.
- **Nova tabela `supplement_entries`:** descartado — `nutrition_items` já cobre.
- **Feature flag:** descartado — mudança aditiva, sem regressão possível.
